<?php
/**
 * PDFCraft cloud API — WordPress network bootstrap + session helpers.
 *
 * The API never stores passwords. It bootstraps the madweb.it network
 * (read-only) so that:
 *  - the standard ".madweb.it" session cookie identifies the user (SSO with
 *    the whole madweb.it suite), and
 *  - login delegates to WP core's wp_signon() — the same accounts, password
 *    hashes and rules as madweb.it.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

/** Load WP once. Forces the main-site host so the network context is stable. */
function pdfcraft_boot_wp(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    $_SERVER['HTTP_HOST']   = PDFCRAFT_WP_HOST;
    $_SERVER['SERVER_NAME'] = PDFCRAFT_WP_HOST;
    $_SERVER['REQUEST_URI'] = '/';
    $_SERVER['SCRIPT_NAME'] = '/wp-load.php';

    if (!defined('ABSPATH')) {
        define('WP_USE_THEMES', false);
        require PDFCRAFT_WP_LOAD;
    }
}

/** Logged-in WP user id, or 0. */
function pdfcraft_logged_in_user(): int
{
    pdfcraft_boot_wp();
    return is_user_logged_in() ? (int) get_current_user_id() : 0;
}

/** Like above, but answers 401 for anonymous callers. */
function pdfcraft_require_user(): int
{
    $id = pdfcraft_logged_in_user();
    if ($id <= 0) {
        pdfcraft_json_out(['error' => 'auth_required'], 401);
    }
    return $id;
}

/** { user: {id,email,displayName}, quotaBytes, usedBytes } for the caller. */
function pdfcraft_me_payload(int $wpId): array
{
    pdfcraft_boot_wp();
    $user = wp_get_current_user();
    $pdo  = pdfcraft_db();
    $quota = pdfcraft_quota($pdo, $wpId);
    return [
        'user' => [
            'id'          => $wpId,
            'email'       => $user->user_email ?? '',
            'displayName' => $user->display_name ?? '',
        ],
        'quotaBytes' => $quota['quotaBytes'],
        'usedBytes'  => $quota['usedBytes'],
    ];
}
