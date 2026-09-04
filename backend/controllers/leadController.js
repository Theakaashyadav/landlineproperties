const { Lead, LeadNote, Property, Project, Broker } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');
const { cleanDocument, escapeRegex, numericId } = require('../utils/documents');

// POST /api/leads  (public — from contact form, enquiry form, property enquiry)
const createLead = asyncHandler(async (req, res) => {
  const { name, phone, email, requirement, property_id, location, budget, message, source } = req.body;
  const projectId = req.body.project_id || req.body.project || null;
  const inquiryType = req.body.inquiry_type || req.body.type || null;

  if (!name || !phone) {
    throw new ApiError(400, 'Name and phone number are required.');
  }
  const phoneClean = String(phone).replace(/[^\d+]/g, '');
  if (phoneClean.length < 8) {
    throw new ApiError(400, 'Please provide a valid phone number.');
  }

  if (property_id) {
    const propertyId = numericId(property_id);
    if (!propertyId || !await Property.exists({ id: propertyId, status: 'published' })) {
      throw new ApiError(400, 'The selected property is no longer available.');
    }
  }

  if (projectId) {
    const normalizedProjectId = numericId(projectId);
    if (!normalizedProjectId || !await Project.exists({ id: normalizedProjectId, status: 'published' })) {
      throw new ApiError(400, 'The selected project is no longer available.');
    }
  }

  const lead = await Lead.create({
    name: String(name).trim().slice(0, 150),
    phone: phoneClean.slice(0, 20),
    email: email ? String(email).trim().slice(0, 190) : null,
    requirement: requirement ? String(requirement).trim().slice(0, 100) : null,
    property_id: property_id ? Number(property_id) : null,
    project_id: projectId ? Number(projectId) : null,
    inquiry_type: inquiryType ? String(inquiryType).trim().slice(0, 100) : null,
    location: location ? String(location).trim().slice(0, 150) : null,
    budget: budget ? String(budget).trim().slice(0, 100) : null,
    message: message ? String(message).trim().slice(0, 2000) : null,
    source: source ? String(source).trim().slice(0, 100) : 'website'
  });

  res.status(201).json({
    success: true,
    message: 'Thank you. Our property expert will contact you shortly.',
    data: { id: lead.id }
  });
});

// GET /api/admin/leads  (admin)
const listLeads = asyncHandler(async (req, res) => {
  const { status, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  const allowedStatuses = ['New','Contacted','Follow-up','Site Visit','Interested','Converted','Not Interested','Closed'];
  if (status && !allowedStatuses.includes(status)) throw new ApiError(400, 'Invalid lead status.');
  if (q && String(q).length > 150) throw new ApiError(400, 'Search query is too long.');
  if (status) filter.status = status;
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
  }

  if (!/^\d+$/.test(String(page)) || Number(page) < 1) throw new ApiError(400, 'page must be a positive integer.');
  if (!/^\d+$/.test(String(limit)) || Number(limit) < 1 || Number(limit) > 100) throw new ApiError(400, 'limit must be between 1 and 100.');
  const pageNum = Number(page);
  const perPage = Number(limit);
  const offset = (pageNum - 1) * perPage;

  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ created_at: -1 }).skip(offset).limit(perPage).lean(),
    Lead.countDocuments(filter)
  ]);
  const propertyIds = [...new Set(leads.map((lead) => lead.property_id).filter(Boolean))];
  const projectIds = [...new Set(leads.map((lead) => lead.project_id).filter(Boolean))];
  const brokerIds = [...new Set(leads.map((lead) => lead.assigned_broker).filter(Boolean))];
  const [properties, projects, brokers] = await Promise.all([
    propertyIds.length ? Property.find({ id: { $in: propertyIds } }).select('id title -_id').lean() : [],
    projectIds.length ? Project.find({ id: { $in: projectIds } }).select('id name -_id').lean() : [],
    brokerIds.length ? Broker.find({ id: { $in: brokerIds } }).select('id name -_id').lean() : []
  ]);
  const propertyNames = new Map(properties.map((property) => [property.id, property.title]));
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const brokerNames = new Map(brokers.map((broker) => [broker.id, broker.name]));
  const rows = leads.map((lead) => ({
    ...cleanDocument(lead),
    property_title: propertyNames.get(lead.property_id) || null,
    project_name: projectNames.get(lead.project_id) || null,
    broker_name: brokerNames.get(lead.assigned_broker) || null
  }));

  res.json({
    success: true,
    data: rows,
    pagination: { page: pageNum, limit: perPage, total, totalPages: Math.ceil(total / perPage) }
  });
});

// PUT /api/admin/leads/:id  (admin — status, assignment, follow-up)
const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, assigned_broker, follow_up_date } = req.body;
  const fields = {};
  const allowedStatuses = ['New','Contacted','Follow-up','Site Visit','Interested','Converted','Not Interested','Closed'];
  if (status && !allowedStatuses.includes(status)) throw new ApiError(400, 'Invalid lead status.');
  if (status) fields.status = status;
  if (assigned_broker !== undefined) {
    if (assigned_broker !== null && assigned_broker !== '' && (!Number.isInteger(Number(assigned_broker)) || Number(assigned_broker) < 1)) {
      throw new ApiError(400, 'Invalid broker selection.');
    }
    fields.assigned_broker = assigned_broker ? Number(assigned_broker) : null;
    if (fields.assigned_broker && !await Broker.exists({ id: fields.assigned_broker })) {
      throw new ApiError(400, 'The selected broker does not exist.');
    }
  }
  if (follow_up_date !== undefined) {
    if (follow_up_date !== null && follow_up_date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(follow_up_date))) {
      throw new ApiError(400, 'Follow-up date must use YYYY-MM-DD format.');
    }
    if (follow_up_date) {
      const parsed = new Date(`${follow_up_date}T00:00:00Z`);
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== follow_up_date) {
        throw new ApiError(400, 'Follow-up date is not valid.');
      }
    }
    fields.follow_up_date = follow_up_date || null;
  }

  if (Object.keys(fields).length === 0) throw new ApiError(400, 'No valid fields to update.');

  const lead = await Lead.findOneAndUpdate(
    { id: Number(id) },
    { $set: fields },
    { returnDocument: 'after', runValidators: true }
  );
  if (!lead) throw new ApiError(404, 'Lead not found.');

  await logActivity({ userId: req.user.id, action: 'Lead Status Changed', entity: 'lead', entityId: Number(id), ip: req.ip });
  res.json({ success: true, message: 'Lead updated.' });
});

// POST /api/admin/leads/:id/notes
const addNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note || !note.trim()) throw new ApiError(400, 'Note text is required.');
  if (note.trim().length > 5000) throw new ApiError(400, 'Note text must not exceed 5000 characters.');
  const leadId = numericId(req.params.id);
  if (!leadId || !await Lead.exists({ id: leadId })) throw new ApiError(404, 'Lead not found.');
  await LeadNote.create({ lead_id: leadId, note: note.trim(), created_by: req.user.id });
  res.status(201).json({ success: true, message: 'Note added.' });
});

const deleteLead = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const result = await Lead.deleteOne({ id });
  if (result.deletedCount === 0) throw new ApiError(404, 'Lead not found.');
  await LeadNote.deleteMany({ lead_id: id });
  await logActivity({ userId: req.user.id, action: 'Lead Deleted', entity: 'lead', entityId: id, ip: req.ip });
  res.json({ success: true, message: 'Lead deleted.' });
});

module.exports = { createLead, listLeads, updateLead, addNote, deleteLead };
