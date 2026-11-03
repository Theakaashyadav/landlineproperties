# Landline Properties

A static website made from HTML, CSS, browser JavaScript and local images. Project details come from the catalog in `js/delhi-ncr-projects.js`; enquiries open WhatsApp. Hosting needs no database, API, admin application or Node.js runtime.

## Publish on Hostinger

1. Run `npm run build` from the repository root using Node.js 20.19 or newer. No dependencies need installing.
2. Upload the **contents** of `dist/` into the domain's `public_html` directory on a static/PHP/HTML website. `index.html` must sit directly inside `public_html`, alongside the CSS, JavaScript and `image/` folder.
3. Open the domain and check a property detail page and an enquiry link.

Include the generated `.htaccess` when uploading. It selects `index.html`,
disables directory listings and turns off the previous Passenger/Node routing
on Hostinger. The public site then runs directly from its static files.

Use static/PHP/HTML hosting for this version. There is no Express entry file, server start command, database connection or environment configuration to set up. If replacing a Node.js Web App, switch the website's hosting setup to static/PHP/HTML in Hostinger; uploading files to an existing managed Node.js deployment does not change its routing configuration.

The build copies public files without transforming the page markup, styles or layout. `dist/` is generated and excluded from Git. Source files, optional build tools and tests remain in the repository.

## Optional local tools

Node.js is only needed for these development commands:

- `npm run build`: refresh the upload-ready `dist/` folder.
- `npm test`: check local references, JavaScript syntax, static catalog behavior and the upload artifact.

Edit the existing public HTML, CSS, browser scripts and catalog, rebuild, then upload the updated static files.

The existing project catalog is preserved. Verified individual sale or rental
listings can be added to the `properties` array in `js/static-data.js`; that array
starts empty rather than presenting project information as available units.
