-- =========================================================
-- LANDLINE PROPERTIES - DATABASE SCHEMA
-- Database: landline_properties
-- =========================================================

CREATE DATABASE IF NOT EXISTS landline_properties
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE landline_properties;

-- ---------------------------------------------------------
-- USERS (admin accounts)
-- ---------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','editor') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- LOCATIONS
-- ---------------------------------------------------------
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  city VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image VARCHAR(255),
  seo_title VARCHAR(255),
  seo_description VARCHAR(500),
  status ENUM('published','draft') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_locations_city (city),
  INDEX idx_locations_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- BROKERS
-- ---------------------------------------------------------
CREATE TABLE brokers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  photo VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(190),
  location_id INT NULL,
  experience_years INT DEFAULT 0,
  specialization VARCHAR(255),
  languages VARCHAR(255),
  about TEXT,
  rating DECIMAL(2,1) DEFAULT 0.0,
  social_links JSON,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('published','draft') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  INDEX idx_brokers_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- PROPERTIES
-- ---------------------------------------------------------
CREATE TABLE properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  property_type ENUM('Apartment','Villa','Plot','Independent House','Builder Floor','Commercial','Office','Shop','Warehouse','Land') NOT NULL,
  purpose ENUM('Buy','Rent','Commercial') NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  price_label VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  locality VARCHAR(150),
  sector VARCHAR(100),
  location_id INT NULL,
  bhk VARCHAR(10),
  bathrooms INT,
  area DECIMAL(10,2),
  area_unit ENUM('Sq.Ft.','Sq.Yd.','Acres') DEFAULT 'Sq.Ft.',
  property_status ENUM('Ready to Move','Under Construction') DEFAULT 'Ready to Move',
  possession_status VARCHAR(100),
  description LONGTEXT,
  short_description VARCHAR(500),
  amenities JSON,
  developer VARCHAR(150),
  rera_number VARCHAR(100),
  property_facing VARCHAR(50),
  floor VARCHAR(20),
  total_floors VARCHAR(20),
  parking VARCHAR(50),
  furnishing ENUM('Unfurnished','Semi-Furnished','Fully Furnished'),
  year_built YEAR,
  broker_id INT NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  new_launch TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('published','draft','pending','sold','rented','unpublished') NOT NULL DEFAULT 'draft',
  seo_title VARCHAR(255),
  seo_description VARCHAR(500),
  canonical_url VARCHAR(255),
  og_image VARCHAR(255),
  views INT NOT NULL DEFAULT 0,
  submitted_by_name VARCHAR(150) NULL,
  submitted_by_phone VARCHAR(20) NULL,
  submitted_by_email VARCHAR(190) NULL,
  is_user_submitted TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_properties_status (status),
  INDEX idx_properties_purpose (purpose),
  INDEX idx_properties_type (property_type),
  INDEX idx_properties_city (city),
  INDEX idx_properties_featured (featured),
  INDEX idx_properties_price (price),
  FULLTEXT INDEX ft_properties_search (title, locality, description)
) ENGINE=InnoDB;

CREATE TABLE property_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_images_property (property_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  developer VARCHAR(150),
  city VARCHAR(100) NOT NULL,
  location_id INT NULL,
  starting_price DECIMAL(15,2),
  configuration VARCHAR(150),
  project_status ENUM('New Launch','Upcoming','Under Construction','Ready to Move') DEFAULT 'New Launch',
  possession VARCHAR(100),
  description LONGTEXT,
  amenities JSON,
  highlights JSON,
  rera_number VARCHAR(100),
  brochure VARCHAR(255),
  featured_image VARCHAR(255),
  is_new_launch TINYINT(1) NOT NULL DEFAULT 0,
  is_upcoming TINYINT(1) NOT NULL DEFAULT 0,
  is_premium TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('published','draft') NOT NULL DEFAULT 'draft',
  seo_title VARCHAR(255),
  seo_description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  INDEX idx_projects_status (status)
) ENGINE=InnoDB;

CREATE TABLE project_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------
CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(190),
  requirement VARCHAR(100),
  property_id INT NULL,
  location VARCHAR(150),
  budget VARCHAR(100),
  message TEXT,
  source VARCHAR(100) DEFAULT 'website',
  assigned_broker INT NULL,
  status ENUM('New','Contacted','Follow-up','Site Visit','Interested','Converted','Not Interested','Closed') NOT NULL DEFAULT 'New',
  follow_up_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_broker) REFERENCES brokers(id) ON DELETE SET NULL,
  INDEX idx_leads_status (status),
  INDEX idx_leads_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE lead_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  note TEXT NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- HOMEPAGE CMS (key/value JSON sections)
-- ---------------------------------------------------------
CREATE TABLE homepage_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(80) NOT NULL UNIQUE, -- hero, why_landline, sell_cta, contact, footer...
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE partner_logos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_path VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  page_context VARCHAR(80) DEFAULT 'homepage',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- MEDIA LIBRARY
-- ---------------------------------------------------------
CREATE TABLE media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_path VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  category ENUM('Properties','Projects','Brokers','Locations','Homepage','Logos','SEO') DEFAULT 'Properties',
  file_size INT,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- SEO SETTINGS (per-URL overrides)
-- ---------------------------------------------------------
CREATE TABLE seo_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_path VARCHAR(255) NOT NULL UNIQUE,
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  h1 VARCHAR(255),
  canonical VARCHAR(255),
  robots VARCHAR(50) DEFAULT 'index,follow',
  og_title VARCHAR(255),
  og_description VARCHAR(500),
  og_image VARCHAR(255),
  twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
  schema_jsonld JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- SETTINGS (single row global settings)
-- ---------------------------------------------------------
CREATE TABLE settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(150) DEFAULT 'Landline Properties',
  logo VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(190),
  whatsapp VARCHAR(20),
  address VARCHAR(255),
  google_maps_embed TEXT,
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  youtube VARCHAR(255),
  linkedin VARCHAR(255),
  seo_default_title VARCHAR(255),
  seo_default_description VARCHAR(500),
  google_analytics_id VARCHAR(50),
  gsc_verification VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_settings_single_row CHECK (id = 1)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- ACTIVITY LOG
-- ---------------------------------------------------------
CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(150) NOT NULL,
  entity VARCHAR(100),
  entity_id INT NULL,
  ip_address VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB;

-- =========================================================
-- SEED DATA
-- =========================================================

-- Default locations
INSERT INTO locations (city, name, slug, description, status) VALUES
('Gurgaon', 'Gurgaon', 'gurgaon', 'Premium residential, commercial and lifestyle locations in Gurgaon.', 'published'),
('Noida', 'Noida', 'noida', 'Planned sectors, new projects and business districts in Noida.', 'published'),
('Greater Noida', 'Greater Noida', 'greater-noida', 'Spacious homes, plots and emerging micro-markets in Greater Noida.', 'published'),
('Delhi NCR', 'Delhi NCR', 'delhi-ncr', 'Properties across the broader Delhi NCR region.', 'published'),
('Uttarakhand', 'Uttarakhand', 'uttarakhand', 'Holiday homes, villas, plots and lifestyle properties across Uttarakhand.', 'published');

-- Default settings row
INSERT INTO settings (id, company_name, phone, email, whatsapp, seo_default_title, seo_default_description)
VALUES (1, 'Landline Properties', '+919876543210', 'hello@landline.com', '919876543210',
  'Landline Properties | Real Estate in Gurgaon, Noida, Greater Noida & Delhi NCR',
  'Find verified properties, new projects and trusted brokers across Delhi NCR with Landline Properties.');

-- NOTE: default admin user is created by backend/utils/seedAdmin.js (uses bcrypt),
-- not inserted here in plaintext. Run `npm run seed:admin` after setup.
