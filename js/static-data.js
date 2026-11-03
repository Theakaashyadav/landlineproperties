(function () {
  'use strict';

  // Add verified individual listings here when available. Project information
  // stays in delhi-ncr-projects.js; projects are not advertised as vacant units.
  const properties = [];
  const normalize = value => String(value || '').trim().toLowerCase().replace(/gurugram/g, 'gurgaon');
  const copy = value => JSON.parse(JSON.stringify(value));

  function selectProperties(filters) {
    return properties.filter(property => {
      if (filters.purpose && property.purpose !== filters.purpose) return false;
      if (filters.region && property.region !== filters.region) return false;
      if (filters.location && !normalize(`${property.city} ${property.locality}`).includes(normalize(filters.location))) return false;
      if (filters.type && normalize(property.property_type) !== normalize(filters.type)) return false;
      if (filters.bhk && normalize(property.bhk) !== normalize(filters.bhk)) return false;
      if (filters.furnishing && normalize(property.furnishing) !== normalize(filters.furnishing)) return false;
      if (filters.property_status && property.property_status !== filters.property_status) return false;
      if (filters.new_launch === 'true' && !property.new_launch) return false;
      if (filters.featured === 'true' && !property.featured) return false;
      const text = normalize(`${property.title} ${property.city} ${property.locality} ${property.description}`);
      if (normalize(filters.q).split(/\s+/).filter(Boolean).some(word => !text.includes(word))) return false;
      if (filters.min_area && !(Number(property.area) >= Number(filters.min_area))) return false;
      if ((filters.min_price || filters.max_price) && !(Number(property.price) > 0)) return false;
      if (filters.min_price && Number(property.price) < Number(filters.min_price)) return false;
      if (filters.max_price && Number(property.price) > Number(filters.max_price)) return false;
      return true;
    });
  }

  function paginate(records, filters) {
    const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 12));
    const sorted = [...records];
    if (filters.sort === 'price_low' || filters.sort === 'price_high') {
      const sign = filters.sort === 'price_low' ? 1 : -1;
      sorted.sort((a, b) => {
        const first = Number(a.price ?? a.starting_price);
        const second = Number(b.price ?? b.starting_price);
        if (!(first > 0)) return second > 0 ? 1 : 0;
        if (!(second > 0)) return -1;
        return sign * (first - second);
      });
    }
    return {
      success: true,
      data: copy(sorted.slice((page - 1) * limit, page * limit)),
      pagination: { page, limit, total: records.length, totalPages: Math.ceil(records.length / limit) }
    };
  }

  // This reads bundled JavaScript data only; it never sends a network request.
  async function request(resource, options = {}) {
    if (options.signal?.aborted) {
      const error = new Error('Selection cancelled.');
      error.name = 'AbortError';
      throw error;
    }
    if (options.method && options.method.toUpperCase() !== 'GET') {
      throw new Error('Send enquiries using the contact form or WhatsApp.');
    }
    const [pathname, query = ''] = String(resource).split('?');
    const filters = Object.fromEntries(new URLSearchParams(query));
    if (pathname === '/properties') return paginate(selectProperties(filters), filters);
    if (pathname === '/projects') {
      const records = window.LandlineProjects.select(filters);
      return paginate(records, filters);
    }
    const projectSlug = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
    if (projectSlug) {
      const project = window.LandlineProjects.find(decodeURIComponent(projectSlug));
      if (project) return { success: true, data: copy(project) };
      throw new Error('Project not found.');
    }
    const propertySlug = pathname.match(/^\/properties\/([^/]+)$/)?.[1];
    if (propertySlug) {
      const property = properties.find(item => item.slug === decodeURIComponent(propertySlug));
      if (property) return { success: true, data: copy(property), related: [] };
      throw new Error('Property not found.');
    }
    throw new Error('Information not found.');
  }

  window.LandlineData = { properties, request };
})();
