const { Project, ProjectImage } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { cleanDocument, escapeRegex } = require('../utils/documents');

const PUBLIC_FIELDS = 'id name slug developer city starting_price configuration project_status possession description amenities highlights rera_number featured_image is_new_launch is_upcoming is_premium seo_title seo_description updated_at -_id';

const listProjects = asyncHandler(async (req, res) => {
  const { location, configuration, status, min_price, max_price, page = 1, limit = 12 } = req.query;
  const filter = { status: 'published' };
  if (location) filter.city = { $regex: escapeRegex(location), $options: 'i' };
  if (configuration) filter.configuration = { $regex: escapeRegex(configuration), $options: 'i' };
  if (status) filter.project_status = status;
  if (Number.isFinite(Number(min_price))) filter.starting_price = { ...filter.starting_price, $gte: Number(min_price) };
  if (Number.isFinite(Number(max_price))) filter.starting_price = { ...filter.starting_price, $lte: Number(max_price) };
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNumber - 1) * perPage;

  const [projects, total] = await Promise.all([
    Project.find(filter).select(PUBLIC_FIELDS).sort({ is_new_launch: -1, updated_at: -1 }).skip(offset).limit(perPage).lean(),
    Project.countDocuments(filter)
  ]);
  const projectIds = projects.map((project) => project.id);
  const images = projectIds.length
    ? await ProjectImage.find({ project_id: { $in: projectIds } }).select('project_id image_path sort_order -_id').sort({ sort_order: 1 }).lean()
    : [];
  const covers = new Map();
  for (const image of images) if (!covers.has(image.project_id)) covers.set(image.project_id, image.image_path);
  const data = projects.map((project) => ({
    ...cleanDocument(project),
    cover_image: project.featured_image || covers.get(project.id) || null
  }));
  res.json({ success: true, data, pagination: { page: pageNumber, limit: perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) } });
});

const getProjectBySlug = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ slug: req.params.slug, status: 'published' }).select(PUBLIC_FIELDS).lean();
  if (!project) throw new ApiError(404, 'Project not found.');
  const images = await ProjectImage.find({ project_id: project.id })
    .select('id image_path alt_text sort_order -_id').sort({ sort_order: 1 }).lean();
  project.images = cleanDocument(images);
  res.json({ success: true, data: project });
});

module.exports = { listProjects, getProjectBySlug };
