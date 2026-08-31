const express = require('express');
const { listLeads, updateLead, addNote, deleteLead } = require('../controllers/leadController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('super_admin', 'admin', 'editor'));

router.get('/', listLeads);
router.put('/:id', updateLead);
router.post('/:id/notes', addNote);
router.delete('/:id', authorize('super_admin', 'admin'), deleteLead);

module.exports = router;
