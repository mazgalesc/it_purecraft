<?php
/**
 * PDFCraft cloud API — HTTP/JSON helpers.
 * AGPL-3.0 — part of the it_purecraft fork.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

/** Send a JSON response and stop. */
function pdfcraft_json_out(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Decode a JSON request body (empty body => []). */
function pdfcraft_json_in(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        pdfcraft_json_out(['error' => 'invalid_json'], 400);
    }
    return $data;
}

/** True when $value is a 16-hex-char id (our ids). */
function pdfcraft_is_id(string $value): bool
{
    return preg_match('/^[a-f0-9]{16}$/', $value) === 1;
}

/** Id of the resource named in the URL (set by the router from the path). */
function pdfcraft_route_id(): string
{
    $id = (string) ($_GET['pdfcraft_id'] ?? '');
    return pdfcraft_is_id($id) ? $id : '';
}

/** Sanitize a user-supplied file/folder name: no paths, no control chars. */
function pdfcraft_sanitize_name(string $name): string
{
    $name = str_replace(["\0", "\r", "\n", '\\', '/'], ' ', $name);
    $name = preg_replace('/\s+/u', ' ', $name) ?? $name;
    $name = trim($name);
    if ($name === '' || $name === '.' || $name === '..') {
        return 'file';
    }
    if (strlen($name) > PDFCRAFT_NAME_MAX) {
        $name = substr($name, 0, PDFCRAFT_NAME_MAX);
    }
    return $name;
}

/**
 * Reject cross-site state-changing calls. Defense in depth:
 *  1. non-GET calls must carry a custom header (a browser will only send it
 *     same-origin — cross-site sends trigger a CORS preflight we never answer),
 *  2. any Origin header present must match our origin.
 */
function pdfcraft_assert_request_ok(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && ($_SERVER['HTTP_X_PDFCRAFT_REQUEST'] ?? '') !== '1') {
        pdfcraft_json_out(['error' => 'forbidden'], 403);
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== PDFCRAFT_ORIGIN) {
        pdfcraft_json_out(['error' => 'forbidden'], 403);
    }
}

/** Client IP for throttling (respects Cloudflare only when we actually sit behind it). */
function pdfcraft_client_ip(): string
{
    $cf = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) {
        return $cf;
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/** RFC 5987-ready filename for Content-Disposition. */
function pdfcraft_download_filename(string $name): string
{
    $ascii = preg_replace('/[^\x20-\x7E]/', '_', $name) ?? 'file';
    return "attachment; filename=\"{$ascii}\"; filename*=UTF-8''"
        . rawurlencode($name);
}
