const express = require('express');
const { listLeads, updateLead, addNote, deleteLead } = require('../controllers/leadController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
// Lead records contain personal contact information. Content-only editors do
// not have access to this router.
router.use(authenticate, authorize('super_admin', 'admin'));

router.get('/', listLeads);
router.put('/:id', updateLead);
router.post('/:id/notes', addNote);
router.delete('/:id', authorize('super_admin', 'admin'), deleteLead);

module.exports = router;
