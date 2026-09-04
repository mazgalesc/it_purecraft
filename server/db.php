<?php
/**
 * PDFCraft cloud API — database bootstrap + schema.
 *
 * PDO on a configurable DSN. Default is SQLite (file-local, zero maintenance);
 * the schema avoids engine-specific SQL (TEXT ids, INSERT OR IGNORE, no
 * AUTOINCREMENT) so `mysql:` DSNs work unchanged.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

/** Open the metadata store, creating dirs/schema as needed. */
function pdfcraft_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dir = PDFCRAFT_DATA_DIR;
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        pdfcraft_json_out(['error' => 'storage_unavailable'], 500);
    }

    $dsn = PDFCRAFT_DB_DSN;
    try {
        $pdo = new PDO($dsn, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        // Surface a generic error; never echo driver messages.
        pdfcraft_json_out(['error' => 'storage_unavailable'], 500);
    }

    if (str_starts_with($dsn, 'sqlite:')) {
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA busy_timeout = 5000');
        $pdo->exec('PRAGMA foreign_keys = ON');
    }

    pdfcraft_migrate($pdo);
    return $pdo;
}

/** Idempotent schema. */
function pdfcraft_migrate(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS users (
            wp_id       INTEGER PRIMARY KEY,
            quota_bytes INTEGER NOT NULL,
            created     TEXT NOT NULL
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS folders (
            id        TEXT PRIMARY KEY,
            owner     INTEGER NOT NULL,
            parent_id TEXT,
            name      TEXT NOT NULL,
            created   TEXT NOT NULL
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS files (
            id        TEXT PRIMARY KEY,
            owner     INTEGER NOT NULL,
            folder_id TEXT,
            name      TEXT NOT NULL,
            stored    TEXT NOT NULL,
            mime      TEXT NOT NULL DEFAULT \'\',
            size      INTEGER NOT NULL,
            created   TEXT NOT NULL,
            tool      TEXT NOT NULL DEFAULT \'\'
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS login_attempts (
            id    TEXT PRIMARY KEY,
            scope TEXT NOT NULL,
            ts    INTEGER NOT NULL
        )'
    );
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_owner ON files(owner)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_attempts_scope ON login_attempts(scope)');
}

/** First touch of a WP user: register their row with the default quota. */
function pdfcraft_ensure_user(PDO $pdo, int $wpId): void
{
    $stmt = $pdo->prepare('INSERT OR IGNORE INTO users (wp_id, quota_bytes, created) VALUES (?, ?, ?)');
    $stmt->execute([$wpId, PDFCRAFT_DEFAULT_QUOTA, gmdate('c')]);
}

/** Quota state for a user: { quotaBytes, usedBytes }. */
function pdfcraft_quota(PDO $pdo, int $wpId): array
{
    pdfcraft_ensure_user($pdo, $wpId);
    $q = $pdo->prepare('SELECT quota_bytes FROM users WHERE wp_id = ?');
    $q->execute([$wpId]);
    $row = $q->fetch();
    $u = $pdo->prepare('SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE owner = ?');
    $u->execute([$wpId]);
    $used = $u->fetch();
    return [
        'quotaBytes' => (int) ($row['quota_bytes'] ?? PDFCRAFT_DEFAULT_QUOTA),
        'usedBytes'  => (int) ($used['used'] ?? 0),
    ];
}
