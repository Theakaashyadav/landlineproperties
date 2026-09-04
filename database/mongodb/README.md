# Landline Properties MongoDB database

This application stores data in the dedicated MongoDB database `landline_properties`.
MongoDB databases contain collections rather than filesystem folders. The database is
created on the first successful seed/write and remains isolated from databases used by
other websites on the same Atlas cluster.

## Collections

- `users`
- `locations`
- `brokers`
- `properties`
- `property_images`
- `projects`
- `project_images`
- `leads`
- `lead_notes`
- `homepage_sections`
- `partner_logos`
- `faqs`
- `media`
- `seo_settings`
- `settings`
- `activity_logs`
- `counters` (numeric IDs used by the existing frontend/API)

Schemas and indexes are defined in `backend/models/index.js`. Do not manually create
collections or copy data from the database used by another website.

## Initialise an empty database

1. Set `MONGODB_URI` to the Atlas cluster connection string.
2. Set `MONGODB_DB_NAME=landline_properties`.
3. Give the application database user only `readWrite` access to
   `landline_properties`.
4. Run `npm run seed:db` to create indexes, default locations and global settings.
5. Set temporary `SEED_ADMIN_*` values and run `npm run seed:admin` once.

Both commands are idempotent: existing settings, locations and admin accounts are left
unchanged.
