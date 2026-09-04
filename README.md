# Landline Properties

Production project containing one public frontend, the admin dashboard, a Node.js API and an isolated MongoDB database.

## Local setup

1. Start MongoDB locally or create a MongoDB Atlas cluster.
2. In `backend`, copy `.env.example` to `.env`. Set `MONGODB_URI`, keep `MONGODB_DB_NAME=landline_properties`, and set a random `JWT_SECRET` of at least 32 characters, `SITE_URL`, and a strong seed-admin password.
3. Install and initialise the dedicated database:
   `npm ci`
   `npm run seed:db`
   `npm run seed:admin`
4. Start the complete site:
   `npm run dev`
5. Open `http://localhost:5000/` and administer it at `http://localhost:5000/admin/login.html`.

Do not open admin HTML files directly with `file://`. The public site, uploads, API and admin app are intentionally served from the same origin.

## Checks

- `npm test` validates required project files and JavaScript syntax.
- `GET /api/health` verifies that both the API process and MongoDB are running.
- Published public properties are returned by `GET /api/properties`.

Uploaded images are stored under `backend/uploads/` and are intentionally excluded from Git. Back them up separately in production.

## Production deployment

1. Create a MongoDB Atlas cluster and a dedicated database user with only `readWrite` access to `landline_properties`. Do not reuse another website's database name or database user.
2. Allow the Hostinger runtime's outbound IP in the Atlas project IP access list.
3. Deploy the repository root without `node_modules` and run `npm ci --omit=dev`. The Hostinger entry file is `server.js` and the start command is `npm start`.
4. In Hostinger environment variables, set `NODE_ENV=production`, `PORT=3000`, the public HTTPS `SITE_URL`, `MONGODB_URI`, `MONGODB_DB_NAME=landline_properties`, a unique 32+ character `JWT_SECRET`, upload limits and the exact allowed origins. Never commit the Atlas URI.
5. Run `npm run seed:db`, then run `npm run seed:admin` once with temporary strong seed credentials and remove the seed values afterward.
6. Persist and back up `backend/uploads`, or replace local uploads with managed object storage before horizontal scaling.
7. Verify `/api/health`, `/api/properties`, `/sitemap.xml`, admin login, one complete CRUD cycle and both public forms before directing traffic.

See `database/mongodb/README.md` for the collection map and database-isolation rules.
