# Custom Admin Server

This is an open local admin panel (no login) for editing content files under:

- `../content/pages/*.yml`
- `../content/events/*.yml`
- `../content/books/*.yml`
- `../content/reports/*.yml`
- `../content/settings.yml`

## Run

```bash
cd site/admin-server
npm i
node server.js
```

Server listens on:

- `http://localhost:5050`
- Or set a custom port: `PORT=5051 node server.js`

Admin UI:

- `http://localhost:5050/admin-custom/`

API:

- `http://localhost:5050/api/*`
- Health check: `http://localhost:5050/health`

## Notes

- This server is for local/private deployment and writes YAML directly to disk
- Public website rendering remains unchanged and continues using the existing static renderer
- No authentication or sessions are enabled in this version
- Runtime boot is now composed in `/app/adminServer/main.js` (clean architecture composition root)

## Clean Architecture Test Gates

Run from repo root:

```bash
cd /Users/yogeshreddy/Desktop/hongci
node tests/run.js
```

This runs:

- boundary rules (`/core` import restrictions)
- core entity tests
- core use case tests

## Smoke Test (composition)

Run from repo root:

```bash
cd /Users/yogeshreddy/Desktop/hongci
node tests/smoke.adminServer.js
```

This verifies the admin server app composes successfully without starting the server.
