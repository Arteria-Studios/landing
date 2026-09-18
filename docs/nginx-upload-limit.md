# Fix 413 on admin media upload

If `/api/admin/upload` returns **413 Content Too Large**, the limit is usually **Nginx** in front of the app (not Next.js).

## Nginx

In your server block for the site:

```nginx
client_max_body_size 50M;
```

Then reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

The app allows up to **50 MB** per file (`lib/upload-limits.js`). Keep nginx at or above that value.

## Direct Docker (no nginx)

Requests hit Next.js on port 3000 directly; the app enforces the 50 MB limit and returns JSON errors.
