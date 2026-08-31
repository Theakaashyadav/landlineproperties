# Landline Properties

Production project containing one public frontend, the admin dashboard, Node.js API and MySQL schema.

## Local setup

1. Create the database:
   `mysql -u root -p < database/landline.sql`
2. In `backend`, copy `.env.example` to `.env` and set the MySQL credentials, a random `JWT_SECRET` of at least 32 characters, `SITE_URL`, and a strong seed-admin password.
3. Install and initialise:
   `npm ci`
   `npm run seed:admin`
4. Start the complete site:
   `npm run dev`
5. Open `http://localhost:5000/` and administer it at `http://localhost:5000/admin/login.html`.

Do not open admin HTML files directly with `file://`. The public site, uploads, API and admin app are intentionally served from the same origin.

## Checks

- `npm test` validates required project files and JavaScript syntax.
- `GET /api/health` verifies that the API process is running.
- Published public properties are returned by `GET /api/properties`.

Uploaded images are stored under `backend/uploads/` and are intentionally excluded from Git. Back them up separately in production.

## Production deployment

1. Provision MySQL 8 with a dedicated least-privilege database user.
2. Import `database/landline.sql` once, then use reviewed migrations for later schema changes.
3. Deploy the repository without `backend/node_modules` and run `npm ci --omit=dev` inside `backend`.
4. Create `backend/.env` on the server. Set `NODE_ENV=production`, the public HTTPS `SITE_URL`, database values, a unique 32+ character `JWT_SECRET`, upload limits and the exact allowed origins. Enable `DB_SSL` when required by the database provider.
5. Run `npm run seed:admin` once with temporary strong seed credentials, then remove the seed values from the environment.
6. Start `node server.js` with a process manager or container restart policy. Terminate TLS at a trusted reverse proxy and forward to port 5000.
7. Persist and back up `backend/uploads`, or replace local uploads with managed object storage before horizontal scaling.
8. Verify `/api/health`, `/api/properties`, `/sitemap.xml`, admin login, one complete CRUD cycle and both public forms before directing traffic.
