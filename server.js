const app = require('./backend/server');

// Direct `node server.js` uses this call. On Hostinger, backend/server.js starts
// when Passenger exposes LSNODE_SOCKET; startServer is idempotent in both cases.
app.startServer();

module.exports = app;
