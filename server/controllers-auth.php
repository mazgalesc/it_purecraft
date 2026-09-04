<?php
/**
 * PDFCraft cloud API — auth controllers (login / logout / me).
 *
 * Login delegates to WP core wp_signon(): same accounts, same password hashes
 * and account rules as madweb.it. On success WP sets the standard auth cookie,
 * which also signs the user into madweb.it itself (shared ".madweb.it" domain).
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/wp-auth.php';

/** POST /api/auth/login — { email, password } → session cookie. */
function pdfcraft_controller_login(): never
{
    $body = pdfcraft_json_in();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        pdfcraft_json_out(['error' => 'missing_credentials'], 400);
    }

    // Per-account + per-IP throttle (brute-force guard; WP's own login-page
    // hardening does not wrap this endpoint).
    $scope = 'login:' . $email . '|' . pdfcraft_client_ip();
    if (pdfcraft_login_is_throttled($scope)) {
        pdfcraft_json_out(
            ['error' => 'too_many_attempts', 'retryAfterSeconds' => PDFCRAFT_LOGIN_WINDOW],
            429
        );
    }

    pdfcraft_boot_wp();
    $user = wp_signon([
        'user_login'    => $email,
        'user_password' => $password,
        'remember'      => true,
    ], false);

    if (is_wp_error($user)) {
        pdfcraft_login_record($scope);
        pdfcraft_json_out(['error' => 'invalid_credentials'], 401);
    }

    pdfcraft_login_clear($scope);
    $id = (int) $user->ID;
    pdfcraft_json_out(pdfcraft_me_payload($id));
}

/** POST /api/auth/logout → clears the WP session cookie. */
function pdfcraft_controller_logout(): never
{
    pdfcraft_boot_wp();
    wp_logout();
    pdfcraft_json_out(['ok' => true]);
}

/** GET /api/me — session + quota state (used by the app shell on every load). */
function pdfcraft_controller_me(): never
{
    $id = pdfcraft_require_user();
    pdfcraft_json_out(pdfcraft_me_payload($id));
}

/* ---------------------------------------------------------------------------
 * Throttle helpers (login_attempts table).
 * ------------------------------------------------------------------------ */

function pdfcraft_login_is_throttled(string $scope): bool
{
    $pdo = pdfcraft_db();
    $cut = time() - PDFCRAFT_LOGIN_WINDOW;
    $del = $pdo->prepare('DELETE FROM login_attempts WHERE ts < ?');
    $del->execute([$cut]);

    $cnt = $pdo->prepare('SELECT COUNT(*) AS c FROM login_attempts WHERE scope = ? AND ts > ?');
    $cnt->execute([$scope, $cut]);
    return (int) ($cnt->fetch()['c'] ?? 0) >= PDFCRAFT_LOGIN_MAX_ATTEMPTS;
}

function pdfcraft_login_record(string $scope): void
{
    $pdo = pdfcraft_db();
    $ins = $pdo->prepare('INSERT INTO login_attempts (id, scope, ts) VALUES (?, ?, ?)');
    $ins->execute([bin2hex(random_bytes(8)), $scope, time()]);
}

function pdfcraft_login_clear(string $scope): void
{
    $pdo = pdfcraft_db();
    $del = $pdo->prepare('DELETE FROM login_attempts WHERE scope = ?');
    $del->execute([$scope]);
}
