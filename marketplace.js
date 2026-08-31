(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const page = document.body.dataset.marketPage;
  const localPreview = location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '5000');
  const origin = String(window.LANDLINE_API_ORIGIN || (localPreview ? 'http://localhost:5000' : location.origin)).replace(/\/$/, '');
  const api = `${origin}/api`;
  const fallbackImage = 'image/home-hero-luxury-evening-v2.png';
  let properties = [];
  let controller;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const imageUrl = (value) => !value ? fallbackImage : /^https?:/i.test(value) ? value : `${origin}${value}`;
  const formatPrice = (property) => {
    if (property.price_label) return escapeHtml(property.price_label);
    const amount = Number(property.price);
    if (!Number.isFinite(amount)) return 'Price on request';
    const label = amount >= 1e7 ? `₹${(amount / 1e7).toFixed(2)} Cr` : amount >= 1e5 ? `₹${(amount / 1e5).toFixed(2)} Lakh` : `₹${amount.toLocaleString('en-IN')}`;
    return property.purpose === 'Rent' ? `${label}/month` : label;
  };
  const state = (message, retry = false) => `<div class="empty" role="status"><strong>${escapeHtml(message)}</strong>${retry ? '<br><button class="btn btn-dark" type="button" data-api-retry>Try Again</button>' : ''}</div>`;

  function card(property) {
    const badge = property.featured ? 'Featured' : property.verified ? 'Verified' : property.new_launch ? 'New Launch' : property.property_status || '';
    const location = [property.locality, property.city].filter(Boolean).join(', ');
    return `<article class="property-card"><div class="property-media"><img src="${escapeHtml(imageUrl(property.cover_image))}" alt="${escapeHtml(`${property.title} in ${property.city}`)}" width="1000" height="690" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}'">${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ''}<button class="heart" type="button" aria-label="Save ${escapeHtml(property.title)}" aria-pressed="false" data-heart>♡</button></div><div class="property-body"><h3>${escapeHtml(property.title)}</h3><p class="location">${escapeHtml(location)}</p><p class="price">${formatPrice(property)}</p><div class="specs">${property.bhk ? `<span>${escapeHtml(property.bhk)}</span>` : ''}${property.area ? `<span>${Number(property.area).toLocaleString('en-IN')} ${escapeHtml(property.area_unit || 'Sq.Ft.')}</span>` : ''}<span>${escapeHtml(property.property_type)}</span>${property.furnishing ? `<span>${escapeHtml(property.furnishing)}</span>` : ''}</div><p class="highlight">${escapeHtml(property.short_description || 'Contact Landline Properties for current availability and complete details.')}</p><div class="card-actions"><a class="btn" href="property-details.html?slug=${encodeURIComponent(property.slug)}">View Details</a><button class="btn btn-dark" type="button" data-enquire="${property.id}" data-property-slug="${escapeHtml(property.slug)}">${page === 'rent' ? 'Schedule Visit' : 'Enquire Now'}</button></div></div></article>`;
  }

  function render() {
    const grid = $('#property-grid');
    if (!grid) return;
    grid.innerHTML = properties.length ? properties.map(card).join('') : state('No published properties match your requirements.');
    const count = $('#result-count');
    if (count) count.textContent = `${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`;
  }

  function apiQuery() {
    const form = $('#market-search');
    const fields = form ? Object.fromEntries(new FormData(form)) : {};
    const query = new URLSearchParams({ purpose: page === 'rent' ? 'Rent' : 'Buy', limit: '48' });
    if (fields.location) query.set('location', fields.location);
    const typeMap = { Residential: '', 'Plot/Land': 'Plot', 'New Project': '' };
    const type = Object.hasOwn(typeMap, fields.type) ? typeMap[fields.type] : fields.type;
    if (type) query.set('type', type);
    if (fields.bhk) query.set('bhk', fields.bhk);
    if (fields.area) query.set('min_area', fields.area);
    if (fields.furnishing) query.set('furnishing', fields.furnishing === 'Furnished' ? 'Fully Furnished' : fields.furnishing);
    if (fields.status === 'New Launch') query.set('new_launch', 'true');
    else if (fields.status) query.set('property_status', fields.status);
    if (fields.budget) {
      const saleBands = { 25: [0, 2500000], 50: [2500000, 5000000], 100: [5000000, 10000000], 200: [10000000, 20000000], '200+': [20000000, 0] };
      if (page === 'rent') query.set('max_price', fields.budget);
      else if (saleBands[fields.budget]) {
        const [min, max] = saleBands[fields.budget];
        if (min) query.set('min_price', min);
        if (max) query.set('max_price', max);
      }
    }
    if ($('#sort')?.value === 'low') query.set('sort', 'price_low');
    if ($('#sort')?.value === 'high') query.set('sort', 'price_high');
    return { query, fields };
  }

  async function load(scroll = false) {
    const grid = $('#property-grid');
    if (!grid) return;
    controller?.abort();
    controller = new AbortController();
    grid.innerHTML = state('Loading current properties…');
    const { query, fields } = apiQuery();
    try {
      const response = await fetch(`${api}/properties?${query}`, { signal: controller.signal });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Unable to load properties.');
      properties = Array.isArray(result.data) ? result.data : [];
      render();
      const visibleQuery = new URLSearchParams();
      Object.entries(fields).forEach(([key, value]) => { if (value) visibleQuery.set(key, value); });
      history.replaceState(null, '', `${location.pathname}${visibleQuery.size ? `?${visibleQuery}` : ''}${location.hash}`);
      if (scroll) $('#listings')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      if (error.name !== 'AbortError') grid.innerHTML = state(error.message || 'Property service is temporarily unavailable.', true);
    }
  }

  function clear() {
    $('#market-search')?.reset();
    $$('[data-filter]').forEach((item) => item.classList.remove('active'));
    history.replaceState(null, '', location.pathname);
    setTimeout(() => load(), 0);
  }
  function openModal(id = '', slug = '', requirement = 'Property enquiry') {
    const modal = $('#enquiry-modal');
    if (!modal) return;
    const propertyField = modal.querySelector('[name="property"]');
    if (propertyField) { propertyField.value = id; propertyField.dataset.slug = slug; }
    const requirementField = modal.querySelector('[name="requirement"]');
    if (requirementField) requirementField.value = requirement;
    modal.showModal();
  }

  async function submitLead(form) {
    const button = form.querySelector('button[type="submit"], button:not([type])');
    if (button?.disabled) return;
    const oldLabel = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Submitting…'; }
    const values = Object.fromEntries(new FormData(form));
    const payload = {
      name: values.name,
      phone: values.phone || values.mobile,
      email: values.email,
      property_id: values.property || undefined,
      requirement: values.requirement,
      location: values.location || values.preferredLocation,
      budget: values.budget,
      message: values.message,
      source: `${page || 'property'}-page`
    };
    try {
      const response = await fetch(`${api}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Unable to submit your enquiry.');
      $('.form-status', form).textContent = result.message || 'Thank you. Your enquiry has been submitted.';
      form.reset();
    } catch (error) {
      const status = $('.form-status', form);
      status.textContent = error.message;
      status.style.color = '#b42318';
    } finally {
      if (button) { button.disabled = false; button.textContent = oldLabel; }
    }
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('#market-search button[type="reset"]')) { event.preventDefault(); clear(); return; }
    const category = event.target.closest('[data-filter]');
    if (category) {
      $$('[data-filter]').forEach((item) => item.classList.remove('active'));
      category.classList.add('active');
      const field = $('#market-search')?.elements[category.dataset.field || 'type'];
      if (field) field.value = category.dataset.filter;
      load(true);
    }
    const enquiry = event.target.closest('[data-enquire]');
    if (enquiry) openModal(enquiry.dataset.enquire, enquiry.dataset.propertySlug, enquiry.dataset.requirement || 'Property enquiry');
    const heart = event.target.closest('[data-heart]');
    if (heart) { const active = heart.getAttribute('aria-pressed') !== 'true'; heart.setAttribute('aria-pressed', String(active)); heart.classList.toggle('active', active); heart.textContent = active ? '♥' : '♡'; }
    if (event.target.closest('[data-modal-close]')) $('#enquiry-modal')?.close();
    if (event.target.closest('[data-clear-filters]')) clear();
    if (event.target.closest('[data-api-retry]')) load();
  });

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#market-search');
    const params = new URLSearchParams(location.search);
    if (form) {
      ['location', 'type', 'bhk', 'budget', 'area', 'furnishing', 'status', 'horizon'].forEach((name) => {
        const field = form.elements[name];
        const value = params.get(name);
        if (field && value && [...field.options || []].some((option) => option.value === value || option.textContent === value)) field.value = value;
      });
      form.addEventListener('submit', (event) => { event.preventDefault(); load(true); });
    }
    $('#sort')?.addEventListener('change', () => load());
    $('#enquiry-form')?.addEventListener('submit', (event) => { event.preventDefault(); submitLead(event.target); });
    const calculator = $('#calculator');
    if (calculator) calculator.addEventListener('input', () => {
      const amount = Math.max(0, Number(calculator.elements.amount?.value) || 0);
      const rate = Number(calculator.elements.growth?.value) || 0;
      const years = Math.max(0, Number(calculator.elements.years?.value) || 0);
      const future = amount && Number.isFinite(rate) && Number.isFinite(years) ? amount * Math.pow(1 + rate / 100, years) : 0;
      $('#future').textContent = formatPrice({ price: Number.isFinite(future) ? Math.round(future) : 0, purpose: 'Buy' });
      $('#growth').textContent = formatPrice({ price: Number.isFinite(future) ? Math.max(0, Math.round(future - amount)) : 0, purpose: 'Buy' });
    });
    load();
  });
  window.LandlineMarket = { load, clear, openModal };
})();
