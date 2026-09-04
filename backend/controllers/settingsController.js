const { Setting } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { cleanDocument } = require('../utils/documents');

const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.findOne({ id: 1 })
    .select('company_name logo phone email whatsapp address instagram facebook youtube linkedin -_id')
    .lean();
  res.json({ success: true, data: cleanDocument(settings) || {} });
});

module.exports = { getPublicSettings };
