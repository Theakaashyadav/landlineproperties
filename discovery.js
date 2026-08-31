(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const localPreview = location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '5000');
  const origin = String(window.LANDLINE_API_ORIGIN || (localPreview ? 'http://localhost:5000' : location.origin)).replace(/\/$/, '');
  const api = `${origin}/api`;
  const fallback = 'image/home-hero-luxury-delhi-ncr.png';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const image = (path) => !path ? fallback : /^https?:/i.test(path) ? path : `${origin}${path}`;
  let projects = [];
  let selected = [];

  const price = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 'Price on request';
    return number >= 1e7 ? `₹${(number / 1e7).toFixed(2)} Cr` : `₹${(number / 1e5).toFixed(2)} Lakh`;
  };
  const parseJson = (value) => {
    if (Array.isArray(value)) return value;
    try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };
  function card(project) {
    const amenities = parseJson(project.amenities).slice(0, 4);
    return `<article class="project-card"><div class="property-media"><img src="${esc(image(project.cover_image))}" alt="${esc(`${project.name} project in ${project.city}`)}" loading="lazy" width="1000" height="625" onerror="this.onerror=null;this.src='${fallback}'"><span class="badge">${esc(project.project_status)}</span></div><div class="property-body"><h3>${esc(project.name)}</h3><p class="location">${esc(project.city)}</p><div class="specs"><span>${esc(project.configuration || 'Configuration on request')}</span>${project.developer ? `<span>${esc(project.developer)}</span>` : ''}</div>${amenities.length ? `<div class="amenities">${amenities.map((item) => `<span>${esc(item)}</span>`).join('')}</div>` : ''}<p class="highlight">${esc(project.description || 'Contact us for current project details, approvals and availability.')}</p><p class="price">${price(project.starting_price)}</p><label class="compare-check"><input type="checkbox" data-compare="${project.id}" ${selected.includes(String(project.id)) ? 'checked' : ''}> Add to comparison</label><div class="card-actions"><a class="btn" href="project-details.html?slug=${encodeURIComponent(project.slug)}">View Project</a><button class="btn btn-dark" type="button" data-project-enquire="${project.id}">Request Details</button></div></div></article>`;
  }
  function render() {
    const grid = $('#project-grid');
    if (!grid) return;
    grid.innerHTML = projects.length ? projects.map(card).join('') : '<div class="empty" role="status"><strong>No published projects match your requirements.</strong></div>';
    if ($('#project-count')) $('#project-count').textContent = `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`;
  }
  function query() {
    const values = Object.fromEntries(new FormData($('#project-search')));
    const params = new URLSearchParams({ limit: '48' });
    if (values.location) params.set('location', values.location);
    if (values.configuration) params.set('configuration', values.configuration.replace('+', ''));
    if (values.status) params.set('status', values.status);
    const bands = { 'under-50': [0, 5e6], '50-100': [5e6, 1e7], '1-2': [1e7, 2e7], '2+': [2e7, 0] };
    if (bands[values.budget]) { const [min, max] = bands[values.budget]; if (min) params.set('min_price', min); if (max) params.set('max_price', max); }
    return { values, params };
  }
  async function load(scroll = false) {
    const grid = $('#project-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty" role="status"><strong>Loading current projects…</strong></div>';
    const { values, params } = query();
    try {
      const response = await fetch(`${api}/projects?${params}`);
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Unable to load projects.');
      projects = result.data || [];
      render();
      const visible = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value) visible.set(key, value); });
      history.replaceState(null, '', `${location.pathname}${visible.size ? `?${visible}` : ''}${location.hash}`);
      if (scroll) $('#projects')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) { grid.innerHTML = `<div class="empty" role="status"><strong>${esc(error.message)}</strong><br><button class="btn btn-dark" data-project-retry>Try Again</button></div>`; }
  }
  function open(id = '') { const modal = $('#enquiry-modal'); if (!modal) return; modal.querySelector('[name="project"]').value = id; modal.showModal(); }
  function updateDock() { const dock = $('#compare-dock'); if (!dock) return; dock.classList.toggle('visible', selected.length > 0); $('p', dock).textContent = `${selected.length} of 3 projects selected`; }
  function compare() {
    const list = projects.filter((item) => selected.includes(String(item.id)));
    const wrap = $('#comparison-panel');
    wrap.innerHTML = list.length < 2 ? '<p>Select at least two projects to compare.</p>' : `<table class="comparison"><thead><tr><th>Project</th>${list.map((item) => `<th>${esc(item.name)}</th>`).join('')}</tr></thead><tbody>${['city', 'configuration', 'project_status', 'starting_price'].map((key) => `<tr><th>${key.replace('_', ' ')}</th>${list.map((item) => `<td>${key === 'starting_price' ? price(item[key]) : esc(item[key] || 'On request')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    wrap.scrollIntoView({ behavior: 'smooth' });
  }
  async function submitLead(form) {
    const button = form.querySelector('button'); const label = button.textContent; button.disabled = true; button.textContent = 'Submitting…';
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(`${api}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: values.name, phone: values.phone || values.mobile, email: values.email, location: values.location, budget: values.budget, requirement: 'Project enquiry', message: [values.message, values.project ? `Project ID: ${values.project}` : ''].filter(Boolean).join('\n'), source: 'new-projects-page' }) });
      const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.message || 'Unable to submit request.');
      $('.form-status', form).textContent = result.message || 'Thank you. Your request has been submitted.'; form.reset();
    } catch (error) { const status = $('.form-status', form); status.textContent = error.message; status.style.color = '#b42318'; }
    finally { button.disabled = false; button.textContent = label; }
  }
  document.addEventListener('click', (event) => {
    const quick = event.target.closest('[data-project-filter]');
    if (quick) { $$('[data-project-filter]').forEach((item) => item.classList.remove('active')); quick.classList.add('active'); const field = $('#project-search')?.elements[quick.dataset.field || 'status']; if (field) field.value = quick.dataset.projectFilter; load(true); }
    const enquiry = event.target.closest('[data-project-enquire]'); if (enquiry) open(enquiry.dataset.projectEnquire);
    if (event.target.closest('[data-project-modal-close]')) $('#enquiry-modal')?.close();
    if (event.target.closest('#compare-now')) compare();
    if (event.target.closest('[data-clear-projects]')) { $('#project-search')?.reset(); setTimeout(() => load(), 0); }
    if (event.target.closest('[data-project-retry]')) load();
  });
  document.addEventListener('change', (event) => { if (!event.target.matches('[data-compare]')) return; const id = event.target.dataset.compare; if (event.target.checked && selected.length >= 3) { event.target.checked = false; return; } selected = event.target.checked ? [...selected, id] : selected.filter((item) => item !== id); updateDock(); });
  document.addEventListener('DOMContentLoaded', () => {
    $('#project-enquiry-form')?.addEventListener('submit', (event) => { event.preventDefault(); submitLead(event.target); });
    const form = $('#project-search'); if (!form) return;
    const params = new URLSearchParams(location.search); ['location', 'configuration', 'budget', 'status'].forEach((name) => { if (form.elements[name] && params.get(name)) form.elements[name].value = params.get(name); });
    form.addEventListener('submit', (event) => { event.preventDefault(); load(true); });
    load();
  });
  window.LandlineProjects = { load, open };
})();
