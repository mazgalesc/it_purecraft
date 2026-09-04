# PDFCraft cloud API (server side)

Small PHP backend for the madweb.it deployment of PDFCraft: authenticated file
cloud with folders, per-user quotas, and login through the existing WordPress
accounts. Lives **outside** the WP docroot on the VPS (`/srv/pdfcraft/api/`).

AGPL-3.0 — original code, part of the `it_purecraft` fork.

## How auth works (no passwords stored here)

Every request identifies the user via the standard WordPress `.madweb.it`
session cookie (the same one madweb.it uses — cross-subdomain SSO is native to
this multisite). `wp-auth.php` bootstraps `/var/www/madweb.it/wp-load.php`
(read-only) and answers:

- `is_user_logged_in()` → current user for API calls;
- `wp_signon()` for `POST /api/auth/login` → sets the same cookie, so a login
  on pdf.madweb.it also logs the user into madweb.it;
- `wp_logout()` for logout.

Registration and password reset intentionally stay on madweb.it.

## Endpoints

| Method/Path | Body | Purpose |
|---|---|---|
| `POST /api/auth/login` | JSON `{email, password}` | login (throttled per email+IP) |
| `POST /api/auth/logout` | — | logout |
| `GET /api/me` | — | user + `{quotaBytes, usedBytes}` |
| `GET /api/files?folder=<id>` | — | children (folders first, then files) |
| `POST /api/files` | multipart `file`, `folder?`, `tool?` | upload (quota-checked) |
| `PATCH /api/files/{id}` | JSON `{name?, folder?}` | rename / move |
| `GET /api/files/{id}/download` | — | stream blob |
| `DELETE /api/files/{id}` | — | delete, frees quota |
| `POST /api/folders` | JSON `{name, folder?}` | create folder |
| `PATCH /api/folders/{id}` | JSON `{name?, folder?}` | rename / move (cycle-safe) |
| `DELETE /api/folders/{id}` | — | recursive delete, frees quota |

Writes require the `X-PDFCraft-Request: 1` header (browsers only send it
same-origin) and reject foreign `Origin`. Downloads/reads rely on cookie auth.
Errors are JSON `{error: code}` with proper statuses:
`400 bad_request`, `401 auth_required`, `403 forbidden`, `404 not_found`,
`409 name_exists`, `413 quota_exceeded|file_too_large`, `415 unsupported_type`,
`429 too_many_attempts`.

## Files on disk

```
/srv/pdfcraft/api/            this tree (php-fpm reads it; NOT web-exposed)
/srv/pdfcraft-files/
  pdfcraft.db                 metadata (SQLite, WAL)
  <wp_user_id>/<id>.bin       file blobs (names never trusted as paths)
```

Quota override for one user (premium tier later):

```sql
UPDATE users SET quota_bytes = 2147483648 WHERE wp_id = <wp_user_id>;
```

## Deploy checklist (VPS, first time)

1. Install the SQLite driver (the metadata store defaults to SQLite):
   ```bash
   apt install -y php8.4-sqlite3 && systemctl restart php8.4-fpm
   ```
   (PDO + `PDFCRAFT_DB_DSN` in `config.php` make MariaDB a drop-in alternative
   if SQLite is ever undesirable — no code change, just the DSN.)
2. Layout + ownership:
   ```bash
   install -d -o www-data -g www-data -m 0750 /srv/pdfcraft/api /srv/pdfcraft-files
   # copy this tree into /srv/pdfcraft/api/ (chown www-data), php -l every file
   ```
3. nginx (same vhost that serves the static app):
   ```nginx
   client_max_body_size 60m;                # PDFCRAFT_MAX_FILE_SIZE + margin
   location ^~ /api/ {
       # never serve files directly — always the front controller
       fastcgi_pass unix:/run/php/php8.4-fpm.sock;
       include fastcgi_params;
       fastcgi_param SCRIPT_FILENAME /srv/pdfcraft/api/index.php;
       fastcgi_param SCRIPT_NAME /api/index.php;
   }
   ```
4. Smoke test (must be run from the same host/browser so the `.madweb.it`
   cookie is present):
   ```bash
   curl -s https://pdf.madweb.it/api/me | head -c 300          # expect 401
   curl -si -X POST https://pdf.madweb.it/api/auth/login \
     -H 'Origin: https://pdf.madweb.it' -H 'X-PDFCraft-Request: 1' \
     -H 'Content-Type: application/json' \
     -d '{"email":"test@madweb.it","password":"…"}'
   ```
   Then replay with the returned cookie jar for `GET /api/files`, uploads, etc.

## Notes

- The app is a login funnel, not DRM — but this API *is* the real boundary for
  file access: blobs are only downloadable by their owner, quotas are enforced
  server-side, and nothing under `/var/www/madweb.it` is touched.
- Rate limiting protects the login endpoint only; per-account scope means a
  distributed attack still hits the per-email cap.
- `pdfcraft.db` + blobs are the user data. Back them up with the rest of the
  server (no automated backups exist yet — see AGENTS.md).
