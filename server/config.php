<?php
/**
 * PDFCraft cloud API — configuration (madweb.it deployment).
 *
 * Paths/constants only. Secrets never live in this repo: on the VPS this tree
 * sits at /srv/pdfcraft/api/ and WP credentials are read from wp-config.php
 * in-process, as the rest of madweb.it does.
 *
 * AGPL-3.0 — part of the it_purecraft fork (github.com/mazgalesc/it_purecraft).
 */

declare(strict_types=1);

/** Absolute path to the WordPress network bootstrap (main site wp-load.php). */
const PDFCRAFT_WP_LOAD = '/var/www/madweb.it/wp-load.php';

/** Host forced while bootstrapping WP so the madweb.it network context loads. */
const PDFCRAFT_WP_HOST = 'madweb.it';

/** Root data dir — OUTSIDE the webroot. Files live in <dir>/<wp_user_id>/<id>.bin. */
const PDFCRAFT_DATA_DIR = '/srv/pdfcraft-files';

/** Metadata store. Default: SQLite (needs php8.4-sqlite3 — install at deploy).
 *  Portable on PDO, so `mysql:host=127.0.0.1;dbname=pdfcraft` also works if
 *  SQLite is ever undesirable. */
const PDFCRAFT_DB_DSN = 'sqlite:' . PDFCRAFT_DATA_DIR . '/pdfcraft.db';

/** Allowed origin for the API (same-origin app; used to reject cross-site calls). */
const PDFCRAFT_ORIGIN = 'https://pdf.madweb.it';

/** Free-tier default quota per user (bytes). Overridable per user in the DB. */
const PDFCRAFT_DEFAULT_QUOTA = 100 * 1024 * 1024; // 100 MiB

/** Hard single-file cap (nginx client_max_body_size must exceed this, e.g. 60m). */
const PDFCRAFT_MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50 MiB

const PDFCRAFT_NAME_MAX = 200;

/** Login throttling. */
const PDFCRAFT_LOGIN_MAX_ATTEMPTS = 10;
const PDFCRAFT_LOGIN_WINDOW = 900; // seconds

/** File types the cloud accepts (matches what PDFCraft tools process). */
const PDFCRAFT_ALLOWED_EXT = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf',
    'txt', 'md', 'csv', 'json', 'eml', 'msg', 'epub', 'mobi', 'cbz', 'djvu', 'psd',
    'ai', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'heic', 'svg',
    'zip', 'pages', 'key', 'numbers',
];
