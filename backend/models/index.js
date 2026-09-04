const mongoose = require('mongoose');

const cleanDocument = (_doc, value) => {
  delete value._id;
  delete value.__v;
  return value;
};

const schemaOptions = {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { transform: cleanDocument },
  toObject: { transform: cleanDocument }
};

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0, min: 0 }
}, { versionKey: false });

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema, 'counters');

async function nextId(sequence) {
  const counter = await Counter.findOneAndUpdate(
    { _id: sequence },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
}

async function syncCounter(sequence, value) {
  if (!Number.isSafeInteger(Number(value)) || Number(value) < 0) return;
  await Counter.updateOne(
    { _id: sequence },
    { $max: { seq: Number(value) } },
    { upsert: true }
  );
}

function numericIdPlugin(schema, { sequence }) {
  schema.add({ id: { type: Number, required: true, unique: true, index: true, min: 1 } });
  schema.pre('validate', async function assignNumericId() {
    if (this.isNew && (this.id === undefined || this.id === null)) {
      this.id = await nextId(sequence);
    }
  });
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 190, unique: true, index: true },
  password_hash: { type: String, required: true, maxlength: 255 },
  role: { type: String, enum: ['super_admin', 'admin', 'editor'], default: 'admin', required: true },
  is_active: { type: Number, enum: [0, 1], default: 1, required: true },
  auth_version: { type: Number, default: 0, min: 0, required: true },
  last_login_at: { type: Date, default: null }
}, schemaOptions);
userSchema.plugin(numericIdPlugin, { sequence: 'users' });

const locationSchema = new mongoose.Schema({
  city: { type: String, required: true, trim: true, maxlength: 100, index: true },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180, unique: true, index: true },
  description: { type: String, default: null },
  image: { type: String, default: null, maxlength: 255 },
  seo_title: { type: String, default: null, maxlength: 255 },
  seo_description: { type: String, default: null, maxlength: 500 },
  status: { type: String, enum: ['published', 'draft'], default: 'published', required: true, index: true }
}, schemaOptions);
locationSchema.plugin(numericIdPlugin, { sequence: 'locations' });

const brokerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180, unique: true, index: true },
  photo: { type: String, default: null, maxlength: 255 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  email: { type: String, default: null, trim: true, lowercase: true, maxlength: 190 },
  location_id: { type: Number, default: null, index: true },
  experience_years: { type: Number, default: 0, min: 0 },
  specialization: { type: String, default: null, maxlength: 255 },
  languages: { type: String, default: null, maxlength: 255 },
  about: { type: String, default: null },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  social_links: { type: mongoose.Schema.Types.Mixed, default: null },
  is_verified: { type: Number, enum: [0, 1], default: 0, required: true },
  status: { type: String, enum: ['published', 'draft'], default: 'published', required: true, index: true }
}, schemaOptions);
brokerSchema.plugin(numericIdPlugin, { sequence: 'brokers' });

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 255 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 255, unique: true, index: true },
  property_type: { type: String, required: true, enum: ['Apartment', 'Villa', 'Plot', 'Independent House', 'Builder Floor', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land'], index: true },
  purpose: { type: String, required: true, enum: ['Buy', 'Rent', 'Commercial'], index: true },
  price: { type: Number, default: null, min: 0, index: true },
  price_label: { type: String, default: null, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 100, index: true },
  locality: { type: String, default: null, maxlength: 150 },
  sector: { type: String, default: null, maxlength: 100 },
  location_id: { type: Number, default: null, index: true },
  bhk: { type: String, default: null, maxlength: 10 },
  bathrooms: { type: Number, default: null, min: 0 },
  area: { type: Number, default: null, min: 0 },
  area_unit: { type: String, enum: ['Sq.Ft.', 'Sq.Yd.', 'Acres'], default: 'Sq.Ft.' },
  property_status: { type: String, enum: ['Ready to Move', 'Under Construction'], default: 'Ready to Move' },
  possession_status: { type: String, default: null, maxlength: 100 },
  description: { type: String, default: null },
  short_description: { type: String, default: null, maxlength: 500 },
  amenities: { type: [String], default: [] },
  developer: { type: String, default: null, maxlength: 150 },
  rera_number: { type: String, default: null, maxlength: 100 },
  property_facing: { type: String, default: null, maxlength: 50 },
  floor: { type: String, default: null, maxlength: 20 },
  total_floors: { type: String, default: null, maxlength: 20 },
  parking: { type: String, default: null, maxlength: 50 },
  furnishing: { type: String, enum: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished', null], default: null },
  year_built: { type: Number, default: null, min: 1000, max: 9999 },
  broker_id: { type: Number, default: null, index: true },
  featured: { type: Number, enum: [0, 1], default: 0, required: true, index: true },
  verified: { type: Number, enum: [0, 1], default: 0, required: true },
  new_launch: { type: Number, enum: [0, 1], default: 0, required: true },
  status: { type: String, enum: ['published', 'draft', 'pending', 'sold', 'rented', 'unpublished'], default: 'draft', required: true, index: true },
  seo_title: { type: String, default: null, maxlength: 255 },
  seo_description: { type: String, default: null, maxlength: 500 },
  canonical_url: { type: String, default: null, maxlength: 255 },
  og_image: { type: String, default: null, maxlength: 255 },
  views: { type: Number, default: 0, min: 0, required: true },
  submitted_by_name: { type: String, default: null, maxlength: 150 },
  submitted_by_phone: { type: String, default: null, maxlength: 20 },
  submitted_by_email: { type: String, default: null, maxlength: 190 },
  is_user_submitted: { type: Number, enum: [0, 1], default: 0, required: true },
  created_by: { type: Number, default: null, index: true }
}, schemaOptions);
propertySchema.index({ title: 'text', locality: 'text', description: 'text' });
propertySchema.plugin(numericIdPlugin, { sequence: 'properties' });

const propertyImageSchema = new mongoose.Schema({
  property_id: { type: Number, required: true, index: true },
  image_path: { type: String, required: true, maxlength: 255 },
  alt_text: { type: String, default: null, maxlength: 255 },
  is_featured: { type: Number, enum: [0, 1], default: 0, required: true },
  sort_order: { type: Number, default: 0, min: 0, required: true }
}, schemaOptions);
propertyImageSchema.index({ property_id: 1, is_featured: -1, sort_order: 1 });
propertyImageSchema.plugin(numericIdPlugin, { sequence: 'property_images' });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 255 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 255, unique: true, index: true },
  developer: { type: String, default: null, maxlength: 150 },
  city: { type: String, required: true, trim: true, maxlength: 100, index: true },
  location_id: { type: Number, default: null, index: true },
  starting_price: { type: Number, default: null, min: 0 },
  configuration: { type: String, default: null, maxlength: 150 },
  project_status: { type: String, enum: ['New Launch', 'Upcoming', 'Under Construction', 'Ready to Move'], default: 'New Launch' },
  possession: { type: String, default: null, maxlength: 100 },
  description: { type: String, default: null },
  amenities: { type: [String], default: [] },
  highlights: { type: [String], default: [] },
  rera_number: { type: String, default: null, maxlength: 100 },
  brochure: { type: String, default: null, maxlength: 255 },
  featured_image: { type: String, default: null, maxlength: 255 },
  is_new_launch: { type: Number, enum: [0, 1], default: 0, required: true },
  is_upcoming: { type: Number, enum: [0, 1], default: 0, required: true },
  is_premium: { type: Number, enum: [0, 1], default: 0, required: true },
  status: { type: String, enum: ['published', 'draft'], default: 'draft', required: true, index: true },
  seo_title: { type: String, default: null, maxlength: 255 },
  seo_description: { type: String, default: null, maxlength: 500 }
}, schemaOptions);
projectSchema.plugin(numericIdPlugin, { sequence: 'projects' });

const projectImageSchema = new mongoose.Schema({
  project_id: { type: Number, required: true, index: true },
  image_path: { type: String, required: true, maxlength: 255 },
  alt_text: { type: String, default: null, maxlength: 255 },
  sort_order: { type: Number, default: 0, min: 0, required: true }
}, schemaOptions);
projectImageSchema.index({ project_id: 1, sort_order: 1 });
projectImageSchema.plugin(numericIdPlugin, { sequence: 'project_images' });

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  email: { type: String, default: null, trim: true, lowercase: true, maxlength: 190 },
  requirement: { type: String, default: null, maxlength: 100 },
  property_id: { type: Number, default: null, index: true },
  project_id: { type: Number, default: null, index: true },
  inquiry_type: { type: String, default: null, maxlength: 100 },
  location: { type: String, default: null, maxlength: 150 },
  budget: { type: String, default: null, maxlength: 100 },
  message: { type: String, default: null, maxlength: 2000 },
  source: { type: String, default: 'website', maxlength: 100 },
  assigned_broker: { type: Number, default: null, index: true },
  status: { type: String, enum: ['New', 'Contacted', 'Follow-up', 'Site Visit', 'Interested', 'Converted', 'Not Interested', 'Closed'], default: 'New', required: true, index: true },
  follow_up_date: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ }
}, schemaOptions);
leadSchema.plugin(numericIdPlugin, { sequence: 'leads' });

const leadNoteSchema = new mongoose.Schema({
  lead_id: { type: Number, required: true, index: true },
  note: { type: String, required: true, trim: true, maxlength: 5000 },
  created_by: { type: Number, default: null, index: true }
}, schemaOptions);
leadNoteSchema.plugin(numericIdPlugin, { sequence: 'lead_notes' });

const homepageSectionSchema = new mongoose.Schema({
  section_key: { type: String, required: true, trim: true, maxlength: 80, unique: true, index: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true }
}, schemaOptions);
homepageSectionSchema.plugin(numericIdPlugin, { sequence: 'homepage_sections' });

const partnerLogoSchema = new mongoose.Schema({
  image_path: { type: String, required: true, maxlength: 255 },
  alt_text: { type: String, default: null, maxlength: 255 },
  sort_order: { type: Number, default: 0, min: 0, required: true }
}, schemaOptions);
partnerLogoSchema.plugin(numericIdPlugin, { sequence: 'partner_logos' });

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, maxlength: 255 },
  answer: { type: String, required: true },
  sort_order: { type: Number, default: 0, min: 0, required: true },
  page_context: { type: String, default: 'homepage', maxlength: 80 }
}, schemaOptions);
faqSchema.plugin(numericIdPlugin, { sequence: 'faqs' });

const mediaSchema = new mongoose.Schema({
  file_path: { type: String, required: true, maxlength: 255 },
  filename: { type: String, required: true, maxlength: 255 },
  alt_text: { type: String, default: null, maxlength: 255 },
  category: { type: String, enum: ['Properties', 'Projects', 'Brokers', 'Locations', 'Homepage', 'Logos', 'SEO'], default: 'Properties' },
  file_size: { type: Number, default: null, min: 0 },
  uploaded_by: { type: Number, default: null, index: true }
}, schemaOptions);
mediaSchema.plugin(numericIdPlugin, { sequence: 'media' });

const seoSettingSchema = new mongoose.Schema({
  page_path: { type: String, required: true, maxlength: 255, unique: true, index: true },
  meta_title: { type: String, default: null, maxlength: 255 },
  meta_description: { type: String, default: null, maxlength: 500 },
  h1: { type: String, default: null, maxlength: 255 },
  canonical: { type: String, default: null, maxlength: 255 },
  robots: { type: String, default: 'index,follow', maxlength: 50 },
  og_title: { type: String, default: null, maxlength: 255 },
  og_description: { type: String, default: null, maxlength: 500 },
  og_image: { type: String, default: null, maxlength: 255 },
  twitter_card: { type: String, default: 'summary_large_image', maxlength: 50 },
  schema_jsonld: { type: mongoose.Schema.Types.Mixed, default: null }
}, schemaOptions);
seoSettingSchema.plugin(numericIdPlugin, { sequence: 'seo_settings' });

const settingSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, default: 1, enum: [1] },
  company_name: { type: String, default: 'Landline Properties', maxlength: 150 },
  logo: { type: String, default: null, maxlength: 255 },
  phone: { type: String, default: null, maxlength: 20 },
  email: { type: String, default: null, maxlength: 190 },
  whatsapp: { type: String, default: null, maxlength: 20 },
  address: { type: String, default: null, maxlength: 255 },
  google_maps_embed: { type: String, default: null },
  instagram: { type: String, default: null, maxlength: 255 },
  facebook: { type: String, default: null, maxlength: 255 },
  youtube: { type: String, default: null, maxlength: 255 },
  linkedin: { type: String, default: null, maxlength: 255 },
  seo_default_title: { type: String, default: null, maxlength: 255 },
  seo_default_description: { type: String, default: null, maxlength: 500 },
  google_analytics_id: { type: String, default: null, maxlength: 50 },
  gsc_verification: { type: String, default: null, maxlength: 255 }
}, schemaOptions);

const activityLogSchema = new mongoose.Schema({
  user_id: { type: Number, default: null, index: true },
  action: { type: String, required: true, maxlength: 150 },
  entity: { type: String, default: null, maxlength: 100 },
  entity_id: { type: Number, default: null },
  ip_address: { type: String, default: null, maxlength: 64 }
}, schemaOptions);
activityLogSchema.index({ created_at: -1 });
activityLogSchema.plugin(numericIdPlugin, { sequence: 'activity_logs' });

function model(name, schema, collection) {
  return mongoose.models[name] || mongoose.model(name, schema, collection);
}

const models = {
  Counter,
  User: model('User', userSchema, 'users'),
  Location: model('Location', locationSchema, 'locations'),
  Broker: model('Broker', brokerSchema, 'brokers'),
  Property: model('Property', propertySchema, 'properties'),
  PropertyImage: model('PropertyImage', propertyImageSchema, 'property_images'),
  Project: model('Project', projectSchema, 'projects'),
  ProjectImage: model('ProjectImage', projectImageSchema, 'project_images'),
  Lead: model('Lead', leadSchema, 'leads'),
  LeadNote: model('LeadNote', leadNoteSchema, 'lead_notes'),
  HomepageSection: model('HomepageSection', homepageSectionSchema, 'homepage_sections'),
  PartnerLogo: model('PartnerLogo', partnerLogoSchema, 'partner_logos'),
  Faq: model('Faq', faqSchema, 'faqs'),
  Media: model('Media', mediaSchema, 'media'),
  SeoSetting: model('SeoSetting', seoSettingSchema, 'seo_settings'),
  Setting: model('Setting', settingSchema, 'settings'),
  ActivityLog: model('ActivityLog', activityLogSchema, 'activity_logs')
};

async function ensureIndexes() {
  await Promise.all(Object.values(models)
    .filter((entry) => entry !== Counter)
    .map((entry) => entry.createIndexes()));
}

module.exports = { ...models, nextId, syncCounter, ensureIndexes };
