(function () {
  'use strict';
  const localHosts = ['localhost', '127.0.0.1'];
  const isFilePreview = location.protocol === 'file:';
  const isSeparateLocalPreview = localHosts.includes(location.hostname) && location.port && location.port !== '5000';
  const configuredOrigin = String(window.LANDLINE_API_ORIGIN || '').replace(/\/$/, '');
  const ORIGIN = configuredOrigin || (isSeparateLocalPreview || isFilePreview ? 'http://localhost:5000' : location.origin);
  const API = `${ORIGIN}/api`;
  const fallback = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetch(`${API}${path}`, { ...options, headers });
    } catch {
      const error = new Error('Property service is temporarily unavailable. Please check your connection and try again.');
      error.code = 'NETWORK_ERROR';
      throw error;
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const safeMessages = {
        400: data?.message || 'Please check the submitted information.',
        401: 'Please sign in again.',
        403: 'This request is not allowed.',
        404: data?.message || 'The requested information was not found.',
        429: 'Too many requests. Please wait and try again.',
        503: 'Property service is temporarily unavailable. Please try again.'
      };
      throw new Error(safeMessages[response.status] || 'We could not complete this request. Please try again.');
    }
    return data;
  }

  const image = path => !path ? fallback : (/^https?:/i.test(path) ? path : `${ORIGIN}${path}`);
  const price = (value, label, purpose) => {
    if (label) return esc(label);
    if (value === null || value === undefined || value === '') return 'Price on request';
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 'Price on request';
    const formatted = number >= 1e7 ? `₹${(number / 1e7).toFixed(2)} Cr`
      : number >= 1e5 ? `₹${(number / 1e5).toFixed(2)} Lakh`
        : `₹${number.toLocaleString('en-IN')}`;
    return purpose === 'Rent' ? `${formatted} / month` : formatted;
  };

  function card(property) {
    const badge = property.featured ? 'FEATURED' : property.verified ? 'VERIFIED' : property.new_launch ? 'NEW LAUNCH' : '';
    return `<article class="card"><div class="card-img"><img src="${esc(image(property.cover_image))}" alt="${esc(`${property.title} in ${property.city}`)}" width="900" height="600" loading="lazy" decoding="async">${badge ? `<span class="badge">${badge}</span>` : ''}</div><div class="card-body"><h2>${esc(property.title)}</h2><p class="location">${esc([property.locality, property.city].filter(Boolean).join(', '))}</p><div class="details">${property.bhk ? `<span>${esc(property.bhk)}</span>` : ''}${property.area ? `<span>${esc(property.area)} ${esc(property.area_unit || 'Sq.Ft.')}</span>` : ''}</div><p class="price">${price(property.price, property.price_label, property.purpose)}</p><div class="card-actions"><a class="btn" href="property-details.html?slug=${encodeURIComponent(property.slug)}">View Property</a><a class="btn btn-dark" href="contact.html?property=${encodeURIComponent(property.id)}">Enquire</a></div></div></article>`;
  }

  function queryForPage(defaultPurpose) {
    const incoming = new URLSearchParams(location.search);
    const requestedPurpose = incoming.get('purpose') || defaultPurpose;
    const output = new URLSearchParams({ purpose: requestedPurpose === 'Investment' ? 'Buy' : requestedPurpose });
    const locationValue = incoming.get('location');
    const type = incoming.get('type');
    const budget = incoming.get('budget');
    if (locationValue && locationValue !== 'All Locations') output.set('location', locationValue);
    if (type && type !== 'All Types') output.set('type', type);
    if (budget === 'custom') {
      const custom = Number(incoming.get('customBudget'));
      const unit = incoming.get('budgetUnit');
      if (Number.isFinite(custom) && custom > 0) output.set('max_price', String(custom * (unit === 'Cr' ? 1e7 : 1e5)));
    } else if (budget && budget !== 'Any Budget') {
      const values = [...String(budget).matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
      const multiplier = /Cr/i.test(budget) ? 1e7 : /Lakh/i.test(budget) ? 1e5 : 1;
      if (values.length) {
        if (/\+$/.test(budget.trim())) output.set('min_price', String(values[0] * multiplier));
        else output.set('max_price', String(values[values.length - 1] * multiplier));
      }
    }
    return output;
  }

  const stateMarkup = (message, retry = false) => `<div class="api-state${retry ? ' error' : ''}" role="status"><p>${esc(message)}</p>${retry ? '<button type="button" class="btn btn-dark" data-api-retry>Try Again</button>' : ''}</div>`;

  async function loadListing(defaultPurpose) {
    const grid = document.querySelector('.properties .grid, main .section .grid');
    if (!grid) return;
    grid.innerHTML = stateMarkup('Loading current properties…');
    try {
      const result = await request(`/properties?${queryForPage(defaultPurpose)}`);
      grid.innerHTML = result.data.length ? result.data.map(card).join('') : stateMarkup('No published properties match these filters. Try another location or contact our team.');
    } catch (error) {
      grid.innerHTML = stateMarkup(error.message, true);
      grid.querySelector('[data-api-retry]')?.addEventListener('click', () => loadListing(defaultPurpose), { once: true });
    }
  }

  async function loadSelected(grid, query, empty) {
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = stateMarkup('Loading current properties…');
    try {
      const result = await request(`/properties?${query}`);
      const properties = Array.isArray(result.data) ? result.data : [];
      grid.innerHTML = properties.length ? properties.map(card).join('') : stateMarkup(empty || 'No published properties are available right now. Please check back soon or contact our team.');
    } catch (error) {
      grid.innerHTML = stateMarkup(error.message, true);
      grid.querySelector('[data-api-retry]')?.addEventListener('click', () => loadSelected(grid, query, empty), { once: true });
    } finally {
      grid.removeAttribute('aria-busy');
    }
  }

  function projectCard(project) {
    const projectPrice = price(project.starting_price, '', 'Buy');
    const badge = project.is_new_launch ? 'NEW LAUNCH' : project.is_upcoming ? 'UPCOMING' : project.is_premium ? 'PREMIUM' : '';
    return `<article class="card"><div class="card-img"><img src="${esc(image(project.cover_image || project.featured_image))}" alt="${esc(`${project.name} in ${project.city}`)}" width="900" height="600" loading="lazy" decoding="async">${badge ? `<span class="badge">${badge}</span>` : ''}</div><div class="card-body"><h2>${esc(project.name)}</h2><p class="location">${esc(project.city)}</p><div class="details">${project.configuration ? `<span>${esc(project.configuration)}</span>` : ''}${project.developer ? `<span>${esc(project.developer)}</span>` : ''}</div><p class="price">${projectPrice === 'Price on request' ? projectPrice : `Starting ${projectPrice}`}</p><div class="card-actions"><a class="btn" href="project-details.html?slug=${encodeURIComponent(project.slug)}">View Project</a><a class="btn btn-dark" href="contact.html?requirement=project-enquiry&project=${encodeURIComponent(project.id)}">Enquire</a></div></div></article>`;
  }

  async function loadProjectsSelected(grid, query, empty) {
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = stateMarkup('Loading current projects…');
    try {
      const result = await request(`/projects?${query}`);
      const projects = Array.isArray(result.data) ? result.data : [];
      grid.innerHTML = projects.length ? projects.map(projectCard).join('') : stateMarkup(empty || 'No published projects are available right now.');
    } catch (error) {
      grid.innerHTML = stateMarkup(error.message, true);
      grid.querySelector('[data-api-retry]')?.addEventListener('click', () => loadProjectsSelected(grid, query, empty), { once: true });
    } finally {
      grid.removeAttribute('aria-busy');
    }
  }

  async function loadDetails() {
    const slug = new URLSearchParams(location.search).get('slug');
    const main = document.querySelector('main');
    if (!main) return;
    if (!slug) {
      main.innerHTML = '<section class="section"><div class="container notice"><h1>Select a property</h1><p>Open a property from the Buy, Investment or New Projects page to view its details.</p><a class="btn btn-dark" href="featured-properties.html">Browse Properties</a></div></section>';
      return;
    }
    try {
      const { data: property, related } = await request(`/properties/${encodeURIComponent(slug)}`);
      document.title = `${property.seo_title || property.title} | Landline Properties`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', property.seo_description || property.short_description || `Explore ${property.title} in ${property.city}.`);
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = `https://landlineproperties.com/property-details.html?slug=${encodeURIComponent(property.slug)}`;
      const images = property.images?.length ? property.images : [{ image_path: null, alt_text: property.title }];
      main.innerHTML = `<section class="page-hero"><div class="container"><span class="eyebrow">${esc(property.property_type)} · ${esc(property.purpose)}</span><h1>${esc(property.title)}</h1><p>${esc([property.locality, property.city].filter(Boolean).join(', '))}</p></div></section><section class="section"><div class="container"><div class="property-media"><img src="${esc(image(images[0].image_path))}" alt="${esc(images[0].alt_text || `${property.title} in ${property.city}`)}" width="1200" height="800"></div><div class="content-grid property-live"><article><span class="eyebrow">Property overview</span><h2>${price(property.price, property.price_label, property.purpose)}</h2><p>${esc(property.description || property.short_description || 'Contact Landline Properties for current availability and complete details.')}</p><div class="details"><span>${esc(property.bhk || property.property_type)}</span>${property.area ? `<span>${esc(property.area)} ${esc(property.area_unit)}</span>` : ''}${property.bathrooms ? `<span>${esc(property.bathrooms)} bathrooms</span>` : ''}</div></article><aside class="notice"><strong>Interested in this property?</strong><p>Request current availability, pricing and a site visit.</p><a class="btn btn-dark" href="contact.html?property=${encodeURIComponent(property.id)}">Get Expert Assistance</a></aside></div>${related?.length ? `<div class="section-head"><h2>Related Properties</h2></div><div class="grid">${related.map(card).join('')}</div>` : ''}</div></section>`;
    } catch (error) {
      main.innerHTML = `<section class="section"><div class="container notice"><h1>Property unavailable</h1><p>${esc(error.message)}</p><button type="button" class="btn btn-dark" data-api-retry>Try Again</button> <a class="btn" href="featured-properties.html">Browse Properties</a></div></section>`;
      main.querySelector('[data-api-retry]')?.addEventListener('click', loadDetails, { once: true });
    }
  }

  function showFormStatus(form, message, error = false) {
    let box = form.querySelector('.landline-form-msg');
    if (!box) { box = document.createElement('p'); box.className = 'landline-form-msg'; box.setAttribute('role', 'status'); form.appendChild(box); }
    box.textContent = message;
    box.style.color = error ? '#b42318' : '#18794e';
  }

  function prefillLeadForm(form) {
    const params = new URLSearchParams(location.search);
    const aliases = {
      'location-assistance': 'Location assistance',
      'investment-consultation': 'Investment consultation',
      'project-enquiry': 'Project enquiry',
      buy: 'Buy Property', rent: 'Rent Property', sell: 'Sell Property', commercial: 'Commercial Property'
    };
    ['location', 'budget', 'requirement'].forEach((name) => {
      const field = form.elements[name];
      let value = params.get(name);
      if (!field || !value) return;
      if (name === 'requirement') value = aliases[value.toLowerCase()] || value;
      if (field instanceof HTMLSelectElement && ![...field.options].some((option) => option.value === value)) {
        field.add(new Option(value, value));
      }
      field.value = value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const context = [];
    if (params.get('project')) context.push(`Project ID: ${params.get('project')}`);
    if (params.get('type')) context.push(`Preferred property type: ${params.get('type')}`);
    if (context.length && form.elements.message && !form.elements.message.value) form.elements.message.value = context.join('\n');
  }

  function wireForm(form, endpoint, source) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"], button:not([type])');
      const label = button?.textContent;
      if (button) { button.disabled = true; button.textContent = 'Submitting…'; }
      const values = Object.fromEntries(new FormData(form));
      Object.entries(values).forEach(([key, value]) => {
        if (typeof value === 'string') values[key] = value.trim();
        if (values[key] === '') delete values[key];
      });
      if (values.bhk && !/^Select /i.test(values.bhk)) values.message = [values.message, `BHK: ${values.bhk}`].filter(Boolean).join('\n');
      delete values.bhk;
      try {
        const payload = source ? { ...values, source, property_id: new URLSearchParams(location.search).get('property') || undefined } : values;
        const response = await request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
        showFormStatus(form, response.message);
        form.reset();
      } catch (error) {
        showFormStatus(form, error.message, true);
      } finally {
        if (button) { button.disabled = false; button.textContent = label; }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page === 'featured-properties.html') loadListing('Buy');
    if (page === 'rent.html') loadListing('Rent');
    if (page === 'new-projects.html') loadSelected(document.getElementById('new-project-grid'), 'new_launch=true&limit=12', 'No new launches are published yet. Contact our team for current project opportunities.');
    if (page === 'index.html') {
      loadSelected(document.getElementById('home-property-grid'), 'featured=true&limit=3', 'No featured properties are published right now. Browse all current properties or contact our team.');
      loadProjectsSelected(document.getElementById('home-project-grid'), 'limit=3', 'No published projects are available right now. Browse the projects page for updates.');
    }
    if (page === 'property-details.html') loadDetails();
    document.querySelectorAll('[data-landline-lead-form]').forEach(form => { prefillLeadForm(form); wireForm(form, '/leads', 'website'); });
    document.querySelectorAll('[data-landline-listing-form]').forEach(form => wireForm(form, '/list-property'));
  });
  window.LandlineAPI = { request, card, projectCard, image, price, apiOrigin: ORIGIN };
})();
