<?php
/**
 * PDFCraft cloud API — front controller (nginx fastcgi SCRIPT_FILENAME target).
 *
 * Routes https://pdf.madweb.it/api/<path> to the controllers. See README.md
 * for the nginx location block and the deploy checklist.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/controllers-auth.php';
require_once __DIR__ . '/controllers-files.php';

/** Reject cross-site state-changing calls (custom header + Origin check). */
pdfcraft_assert_request_ok();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path   = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path   = preg_replace('#^/?api/?#', '', $path) ?? '';
$seg    = array_values(array_filter(explode('/', $path), static fn ($s) => $s !== ''));

/** { route-id } for sub-resource calls; validated downstream by pdfcraft_is_id(). */
if (isset($seg[1])) {
    $_GET['pdfcraft_id'] = $seg[1];
}

/* ---- GET -------------------------------------------------------------- */

if ($method === 'GET') {
    if ($seg[0] ?? '' === 'me' && count($seg) === 1) {
        pdfcraft_controller_me();
    }
    if ($seg[0] ?? '' === 'files' && count($seg) === 1) {
        pdfcraft_controller_list();
    }
    if (($seg[0] ?? '') === 'files' && count($seg) === 3 && ($seg[2] ?? '') === 'download') {
        pdfcraft_controller_download();
    }
    pdfcraft_json_out(['error' => 'not_found'], 404);
}

/* ---- POST ------------------------------------------------------------- */

if ($method === 'POST') {
    if (($seg[0] ?? '') === 'auth' && ($seg[1] ?? '') === 'login') {
        pdfcraft_controller_login();
    }
    if (($seg[0] ?? '') === 'auth' && ($seg[1] ?? '') === 'logout') {
        pdfcraft_controller_logout();
    }
    if (($seg[0] ?? '') === 'files' && count($seg) === 1) {
        pdfcraft_controller_upload();
    }
    if (($seg[0] ?? '') === 'folders' && count($seg) === 1) {
        pdfcraft_controller_create_folder();
    }
    pdfcraft_json_out(['error' => 'not_found'], 404);
}

/* ---- PATCH ------------------------------------------------------------ */

if ($method === 'PATCH') {
    if (($seg[0] ?? '') === 'files' && count($seg) === 2) {
        pdfcraft_controller_update_file();
    }
    if (($seg[0] ?? '') === 'folders' && count($seg) === 2) {
        pdfcraft_controller_update_folder();
    }
    pdfcraft_json_out(['error' => 'not_found'], 404);
}

/* ---- DELETE ----------------------------------------------------------- */

if ($method === 'DELETE') {
    if (($seg[0] ?? '') === 'files' && count($seg) === 2) {
        pdfcraft_controller_delete_file();
    }
    if (($seg[0] ?? '') === 'folders' && count($seg) === 2) {
        pdfcraft_controller_delete_folder();
    }
    pdfcraft_json_out(['error' => 'not_found'], 404);
}

pdfcraft_json_out(['error' => 'method_not_allowed'], 405);
