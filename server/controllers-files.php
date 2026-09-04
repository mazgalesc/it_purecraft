<?php
/**
 * PDFCraft cloud API — files & folders controllers.
 *
 * Storage model: files are opaque `<wp_user_id>/<id>.bin` blobs on disk; names,
 * folders, quotas and ownership live in the metadata DB. Nothing user-supplied
 * ever becomes a filesystem path.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/wp-auth.php';

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

/** Validate that a folder id belongs to the user; return row or 0. */
function pdfcraft_owned_folder(PDO $pdo, int $owner, string $folderId): array
{
    $stmt = $pdo->prepare('SELECT * FROM folders WHERE id = ? AND owner = ?');
    $stmt->execute([$folderId, $owner]);
    $row = $stmt->fetch();
    return $row ?: [];
}

function pdfcraft_owned_file(PDO $pdo, int $owner, string $fileId): array
{
    $stmt = $pdo->prepare('SELECT * FROM files WHERE id = ? AND owner = ?');
    $stmt->execute([$fileId, $owner]);
    $row = $stmt->fetch();
    return $row ?: [];
}

/** True if a sibling (same parent) already carries $name. Parent column differs
 *  per table: files.folder_id vs folders.parent_id — passed in, never from input. */
function pdfcraft_name_taken(PDO $pdo, int $owner, ?string $parentId, string $name, string $table, string $parentColumn, string $exceptId = ''): bool
{
    if ($parentId === null || $parentId === '') {
        $stmt = $pdo->prepare("SELECT 1 FROM {$table} WHERE owner = ? AND {$parentColumn} IS NULL AND name = ? AND id <> ?");
        $stmt->execute([$owner, $name, $exceptId]);
    } else {
        $stmt = $pdo->prepare("SELECT 1 FROM {$table} WHERE owner = ? AND {$parentColumn} = ? AND name = ? AND id <> ?");
        $stmt->execute([$owner, $parentId, $name, $exceptId]);
    }
    return $stmt->fetch() !== false;
}

function pdfcraft_file_json(array $row): array
{
    return [
        'type'    => 'file',
        'id'      => $row['id'],
        'name'    => $row['name'],
        'size'    => (int) $row['size'],
        'mime'    => $row['mime'],
        'tool'    => $row['tool'],
        'created' => $row['created'],
    ];
}

function pdfcraft_folder_json(array $row): array
{
    return [
        'type'    => 'folder',
        'id'      => $row['id'],
        'name'    => $row['name'],
        'created' => $row['created'],
    ];
}

function pdfcraft_user_dir(int $owner): string
{
    return PDFCRAFT_DATA_DIR . '/' . $owner;
}

/* ---------------------------------------------------------------------------
 * Files
 * ------------------------------------------------------------------------ */

/** GET /api/files?folder=<id> — children (folders first, then files). */
function pdfcraft_controller_list(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();

    /* Recent-across-folders mode: GET /api/files?recent=N (dashboard feed).
     * Newest files first regardless of folder, each with its folder name. */
    if (isset($_GET['recent'])) {
        $limit = min(max((int) $_GET['recent'], 1), 50);
        $q = $pdo->prepare(
            'SELECT f.*, COALESCE(fo.name, \'\') AS folder_name
             FROM files f LEFT JOIN folders fo ON fo.id = f.folder_id
             WHERE f.owner = ?
             ORDER BY f.created DESC, f.id DESC
             LIMIT ' . $limit
        );
        $q->execute([$owner]);
        $items = [];
        foreach ($q as $row) {
            $item = pdfcraft_file_json($row);
            $item['folderName'] = $row['folder_name'];
            $items[] = $item;
        }
        pdfcraft_json_out(['items' => $items, 'recent' => true]);
    }

    $folder = (string) ($_GET['folder'] ?? '');
    if ($folder !== '' && !pdfcraft_is_id($folder)) {
        pdfcraft_json_out(['error' => 'bad_request'], 400);
    }
    if ($folder !== '' && !pdfcraft_owned_folder($pdo, $owner, $folder)) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }

    $items = [];
    if ($folder === '') {
        $f = $pdo->prepare('SELECT * FROM folders WHERE owner = ? AND parent_id IS NULL ORDER BY name');
        $f->execute([$owner]);
        foreach ($f as $row) {
            $items[] = pdfcraft_folder_json($row);
        }
        $g = $pdo->prepare('SELECT * FROM files WHERE owner = ? AND folder_id IS NULL ORDER BY name');
        $g->execute([$owner]);
        foreach ($g as $row) {
            $items[] = pdfcraft_file_json($row);
        }
    } else {
        $f = $pdo->prepare('SELECT * FROM folders WHERE owner = ? AND parent_id = ? ORDER BY name');
        $f->execute([$owner, $folder]);
        foreach ($f as $row) {
            $items[] = pdfcraft_folder_json($row);
        }
        $g = $pdo->prepare('SELECT * FROM files WHERE owner = ? AND folder_id = ? ORDER BY name');
        $g->execute([$owner, $folder]);
        foreach ($g as $row) {
            $items[] = pdfcraft_file_json($row);
        }
    }

    pdfcraft_json_out(['items' => $items, 'folder' => $folder]);
}

/** POST /api/files — multipart: file=<blob>, folder=<optional id>. */
function pdfcraft_controller_upload(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();

    $folder = (string) ($_POST['folder'] ?? '');
    if ($folder !== '' && !pdfcraft_is_id($folder)) {
        pdfcraft_json_out(['error' => 'bad_request'], 400);
    }
    if ($folder !== '' && !pdfcraft_owned_folder($pdo, $owner, $folder)) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        pdfcraft_json_out(['error' => 'upload_failed'], 400);
    }

    $tmp   = $_FILES['file']['tmp_name'];
    $size  = (int) $_FILES['file']['size'];
    $orig  = pdfcraft_sanitize_name((string) ($_FILES['file']['name'] ?? ''));
    $ext   = strtolower(pathinfo($orig, PATHINFO_EXTENSION));

    if ($size <= 0) {
        pdfcraft_json_out(['error' => 'empty_file'], 400);
    }
    if ($size > PDFCRAFT_MAX_FILE_SIZE) {
        pdfcraft_json_out(['error' => 'file_too_large'], 413);
    }
    if ($ext === '' || !in_array($ext, PDFCRAFT_ALLOWED_EXT, true)) {
        pdfcraft_json_out(['error' => 'unsupported_type'], 415);
    }

    $quota = pdfcraft_quota($pdo, $owner);
    $remaining = $quota['quotaBytes'] - $quota['usedBytes'];
    if ($remaining <= 0 || $size > $remaining) {
        pdfcraft_json_out(['error' => 'quota_exceeded'], 413);
    }

    $dir = pdfcraft_user_dir($owner);
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        pdfcraft_json_out(['error' => 'storage_unavailable'], 500);
    }

    $id = bin2hex(random_bytes(8));
    $stored = $dir . '/' . $id . '.bin';

    if (!@move_uploaded_file($tmp, $stored)) {
        pdfcraft_json_out(['error' => 'upload_failed'], 500);
    }
    // Re-verify size on disk (defense against lying clients/limits).
    $realSize = @filesize($stored);
    if ($realSize === false || $realSize > PDFCRAFT_MAX_FILE_SIZE) {
        @unlink($stored);
        pdfcraft_json_out(['error' => 'file_too_large'], 413);
    }

    $mime = '';
    if (class_exists('finfo')) {
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($stored) ?: '';
    }
    if ($mime === false || $mime === '') {
        $mime = 'application/octet-stream';
    }

    $folderCol = $folder === '' ? null : $folder;
    $tool = substr((string) ($_POST['tool'] ?? ''), 0, 60);
    $stmt = $pdo->prepare(
        'INSERT INTO files (id, owner, folder_id, name, stored, mime, size, created, tool)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$id, $owner, $folderCol, $orig, basename($stored), $mime, $realSize, gmdate('c'), $tool]);

    pdfcraft_json_out(['item' => pdfcraft_file_json(pdfcraft_owned_file($pdo, $owner, $id))], 201);
}

/** GET /api/files/{id}/download — streams the blob to the owner. */
function pdfcraft_controller_download(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();
    $file  = pdfcraft_owned_file($pdo, $owner, $_GET['fileId'] ?? pdfcraft_route_id());
    if (!$file) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }
    $path = pdfcraft_user_dir($owner) . '/' . $file['stored'];
    if (!is_file($path)) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }

    header('Content-Type: application/octet-stream');
    header('Content-Disposition: ' . pdfcraft_download_filename($file['name']));
    header('Content-Length: ' . $file['size']);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store');
    readfile($path);
    exit;
}

/** PATCH /api/files/{id} — { name?, folder? } rename / move. */
function pdfcraft_controller_update_file(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();
    $file  = pdfcraft_owned_file($pdo, $owner, pdfcraft_route_id());
    if (!$file) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }
    $body = pdfcraft_json_in();

    if (array_key_exists('name', $body)) {
        $name = pdfcraft_sanitize_name((string) $body['name']);
        if (pdfcraft_name_taken($pdo, $owner, $file['folder_id'], $name, 'files', 'folder_id', $file['id'])) {
            pdfcraft_json_out(['error' => 'name_exists'], 409);
        }
        $up = $pdo->prepare('UPDATE files SET name = ? WHERE id = ? AND owner = ?');
        $up->execute([$name, $file['id'], $owner]);
    }

    if (array_key_exists('folder', $body)) {
        $target = trim((string) $body['folder']);
        if ($target !== '' && !pdfcraft_owned_folder($pdo, $owner, $target)) {
            pdfcraft_json_out(['error' => 'not_found'], 404);
        }
        $targetId = $target === '' ? null : $target;
        $newName = pdfcraft_sanitize_name((string) ($body['name'] ?? $file['name']));
        if (pdfcraft_name_taken($pdo, $owner, $targetId, $newName, 'files', 'folder_id', $file['id'])) {
            pdfcraft_json_out(['error' => 'name_exists'], 409);
        }
        $up = $pdo->prepare('UPDATE files SET folder_id = ?, name = ? WHERE id = ? AND owner = ?');
        $up->execute([$targetId, $newName, $file['id'], $owner]);
    }

    pdfcraft_json_out(['item' => pdfcraft_file_json(pdfcraft_owned_file($pdo, $owner, $file['id']))]);
}

/** DELETE /api/files/{id} */
function pdfcraft_controller_delete_file(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();
    $file  = pdfcraft_owned_file($pdo, $owner, pdfcraft_route_id());
    if (!$file) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }
    $del = $pdo->prepare('DELETE FROM files WHERE id = ? AND owner = ?');
    $del->execute([$file['id'], $owner]);
    @unlink(pdfcraft_user_dir($owner) . '/' . $file['stored']);
    pdfcraft_json_out(['ok' => true, 'usage' => pdfcraft_quota($pdo, $owner)]);
}

/* ---------------------------------------------------------------------------
 * Folders
 * ------------------------------------------------------------------------ */

/** POST /api/folders — { name, folder? } */
function pdfcraft_controller_create_folder(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();
    $body  = pdfcraft_json_in();
    if (trim((string) ($body['name'] ?? '')) === '') {
        pdfcraft_json_out(['error' => 'name_required'], 400);
    }
    $name  = pdfcraft_sanitize_name((string) $body['name']);
    $parent = trim((string) ($body['folder'] ?? ''));
    if ($parent !== '' && !pdfcraft_is_id($parent)) {
        pdfcraft_json_out(['error' => 'bad_request'], 400);
    }
    if ($parent !== '' && !pdfcraft_owned_folder($pdo, $owner, $parent)) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }
    $parentId = $parent === '' ? null : $parent;
    if (pdfcraft_name_taken($pdo, $owner, $parentId, $name, 'folders', 'parent_id')) {
        pdfcraft_json_out(['error' => 'name_exists'], 409);
    }
    $id = bin2hex(random_bytes(8));
    $ins = $pdo->prepare('INSERT INTO folders (id, owner, parent_id, name, created) VALUES (?, ?, ?, ?, ?)');
    $ins->execute([$id, $owner, $parentId, $name, gmdate('c')]);
    pdfcraft_json_out(['item' => pdfcraft_folder_json(pdfcraft_owned_folder($pdo, $owner, $id))], 201);
}

/** PATCH /api/folders/{id} — { name?, folder? } rename / move (cycle-safe). */
function pdfcraft_controller_update_folder(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();
    $id    = pdfcraft_route_id();
    $folder = pdfcraft_owned_folder($pdo, $owner, $id);
    if (!$folder) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }
    $body = pdfcraft_json_in();

    if (array_key_exists('name', $body)) {
        $name = pdfcraft_sanitize_name((string) $body['name']);
        if (pdfcraft_name_taken($pdo, $owner, $folder['parent_id'], $name, 'folders', 'parent_id', $id)) {
            pdfcraft_json_out(['error' => 'name_exists'], 409);
        }
        $up = $pdo->prepare('UPDATE folders SET name = ? WHERE id = ? AND owner = ?');
        $up->execute([$name, $id, $owner]);
    }

    if (array_key_exists('folder', $body)) {
        $target = trim((string) $body['folder']);
        if ($target === $id) {
            pdfcraft_json_out(['error' => 'bad_request'], 400);
        }
        if ($target !== '' && !pdfcraft_owned_folder($pdo, $owner, $target)) {
            pdfcraft_json_out(['error' => 'not_found'], 404);
        }
        // Cycle guard: target must not be inside the folder being moved.
        if ($target !== '') {
            $ancestors = pdfcraft_ancestor_ids($pdo, $owner, $target);
            if (in_array($id, $ancestors, true)) {
                pdfcraft_json_out(['error' => 'cannot_move_into_self'], 400);
            }
        }
        $targetId = $target === '' ? null : $target;
        $up = $pdo->prepare('UPDATE folders SET parent_id = ? WHERE id = ? AND owner = ?');
        $up->execute([$targetId, $id, $owner]);
    }

    pdfcraft_json_out(['item' => pdfcraft_folder_json(pdfcraft_owned_folder($pdo, $owner, $id))]);
}

/** DELETE /api/folders/{id} — recursive delete; contained files free quota. */
function pdfcraft_controller_delete_folder(): never
{
    $owner = pdfcraft_require_user();
    $pdo   = pdfcraft_db();
    $id    = pdfcraft_route_id();
    if (!pdfcraft_owned_folder($pdo, $owner, $id)) {
        pdfcraft_json_out(['error' => 'not_found'], 404);
    }

    $sub = pdfcraft_folder_subtree($pdo, $owner, $id); // ['folderIds' => [], 'files' => [row...]]

    $dir = pdfcraft_user_dir($owner);
    foreach ($sub['files'] as $fileRow) {
        @unlink($dir . '/' . $fileRow['stored']);
    }

    $pdo->beginTransaction();
    try {
        $delF = $pdo->prepare('DELETE FROM files WHERE id = ?');
        foreach ($sub['files'] as $fileRow) {
            $delF->execute([$fileRow['id']]);
        }
        $delD = $pdo->prepare('DELETE FROM folders WHERE id = ?');
        foreach ($sub['folderIds'] as $fid) {
            $delD->execute([$fid]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        pdfcraft_json_out(['error' => 'delete_failed'], 500);
    }

    pdfcraft_json_out(['ok' => true, 'usage' => pdfcraft_quota($pdo, $owner)]);
}

/* ---------------------------------------------------------------------------
 * Tree helpers
 * ------------------------------------------------------------------------ */

/** Ids of $folderId and every descendant folder. */
function pdfcraft_folder_subtree(PDO $pdo, int $owner, string $folderId): array
{
    $folderIds = [$folderId => true];
    $files = [];
    $queue = [$folderId];

    $qFolders = $pdo->prepare('SELECT id FROM folders WHERE owner = ? AND parent_id = ?');
    $qFiles   = $pdo->prepare('SELECT id, stored FROM files WHERE owner = ? AND folder_id = ?');

    while ($queue) {
        $parent = array_pop($queue);

        $qFolders->execute([$owner, $parent]);
        foreach ($qFolders as $row) {
            if (!isset($folderIds[$row['id']])) {
                $folderIds[$row['id']] = true;
                $queue[] = $row['id'];
            }
        }

        $qFiles->execute([$owner, $parent]);
        foreach ($qFiles as $row) {
            $files[] = $row;
        }
    }

    return ['folderIds' => array_keys($folderIds), 'files' => $files];
}

/** All ancestor folder ids of $folderId (walking up), excluding itself. */
function pdfcraft_ancestor_ids(PDO $pdo, int $owner, string $folderId): array
{
    $ids = [];
    $q = $pdo->prepare('SELECT parent_id FROM folders WHERE id = ? AND owner = ?');
    $current = $folderId;
    $guard = 0;
    while ($guard++ < 100) {
        $q->execute([$current, $owner]);
        $row = $q->fetch();
        if (!$row || $row['parent_id'] === null) {
            break;
        }
        $ids[] = $row['parent_id'];
        $current = $row['parent_id'];
    }
    return $ids;
}
