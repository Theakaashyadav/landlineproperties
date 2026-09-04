(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const localPreview = location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '5000');
  const origin = String(window.LANDLINE_API_ORIGIN || (localPreview ? 'http://localhost:5000' : location.origin)).replace(/\/$/, '');
  const api = `${origin}/api`;
  const fallback = 'image/home-hero-luxury-delhi-ncr.png';
  const PAGE_SIZE = 12;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const image = (path) => !path ? fallback : /^https?:/i.test(path) ? path : `${origin}${path}`;
  let projects = [];
  let selected = [];
  let pagination = { page: 1, total: 0, totalPages: 1 };
  let controller;

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
    return `<article class="project-card"><div class="property-media"><img src="${esc(image(project.cover_image))}" alt="${esc(`${project.name} project in ${project.city}`)}" loading="lazy" width="1000" height="625" onerror="this.onerror=null;this.src='${fallback}'">${project.project_status ? `<span class="badge">${esc(project.project_status)}</span>` : ''}</div><div class="property-body"><h3>${esc(project.name)}</h3><p class="location">${esc(project.city)}</p><div class="specs"><span>${esc(project.configuration || 'Configuration on request')}</span>${project.developer ? `<span>${esc(project.developer)}</span>` : ''}</div>${amenities.length ? `<div class="amenities">${amenities.map((item) => `<span>${esc(item)}</span>`).join('')}</div>` : ''}<p class="highlight">${esc(project.description || 'Contact us for current project details, approvals and availability.')}</p><p class="price">${price(project.starting_price)}</p><label class="compare-check"><input type="checkbox" data-compare="${project.id}" ${selected.includes(String(project.id)) ? 'checked' : ''}> Add to comparison</label><div class="card-actions"><a class="btn" href="project-details.html?slug=${encodeURIComponent(project.slug)}">View Project</a><button class="btn btn-dark" type="button" data-project-enquire="${project.id}" data-project-name="${esc(project.name)}" data-project-location="${esc(project.city)}" data-project-type="${esc(project.configuration || '')}">Request Details</button></div></div></article>`;
  }

  function paginationControl() {
    const grid = $('#project-grid');
    if (!grid) return null;
    let wrap = $('#project-pagination');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'project-pagination';
      wrap.className = 'search-actions';
      wrap.style.justifyContent = 'center';
      wrap.style.marginTop = '28px';
      wrap.innerHTML = '<button class="btn btn-dark" type="button" data-load-more-projects>Load More Projects</button><span role="status" aria-live="polite"></span>';
      grid.insertAdjacentElement('afterend', wrap);
    }
    return wrap;
  }

  function updatePagination() {
    const wrap = paginationControl();
    if (!wrap) return;
    wrap.hidden = !(pagination.page < pagination.totalPages && projects.length < pagination.total);
    const button = $('[data-load-more-projects]', wrap);
    const status = $('[role="status"]', wrap);
    if (button) { button.disabled = false; button.textContent = 'Load More Projects'; }
    if (status) status.textContent = '';
  }

  function render() {
    const grid = $('#project-grid');
    if (!grid) return;
    grid.innerHTML = projects.length ? projects.map(card).join('') : '<div class="empty" role="status"><strong>No published projects match your requirements.</strong></div>';
    if ($('#project-count')) $('#project-count').textContent = pagination.total > projects.length
      ? `Showing ${projects.length} of ${pagination.total} projects`
      : `${pagination.total} ${pagination.total === 1 ? 'project' : 'projects'}`;
    updatePagination();
  }
  function query() {
    const values = Object.fromEntries(new FormData($('#project-search')));
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (values.location) params.set('location', values.location);
    if (values.configuration) params.set('configuration', values.configuration.replace('+', ''));
    if (values.status) params.set('status', values.status);
    const bands = { 'under-50': [0, 5e6], '50-100': [5e6, 1e7], '1-2': [1e7, 2e7], '2+': [2e7, 0] };
    if (bands[values.budget]) { const [min, max] = bands[values.budget]; if (min) params.set('min_price', min); if (max) params.set('max_price', max); }
    return { values, params };
  }
  async function load(scroll = false, append = false) {
    const grid = $('#project-grid');
    if (!grid) return;
    controller?.abort();
    controller = new AbortController();
    const nextPage = append ? pagination.page + 1 : 1;
    const loadMore = $('[data-load-more-projects]');
    if (append && loadMore) { loadMore.disabled = true; loadMore.textContent = 'Loading…'; }
    else grid.innerHTML = '<div class="empty" role="status"><strong>Loading current projects…</strong></div>';
    const { values, params } = query();
    params.set('page', String(nextPage));
    try {
      const response = await fetch(`${api}/projects?${params}`, { signal: controller.signal });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Unable to load projects.');
      const incoming = Array.isArray(result.data) ? result.data : [];
      projects = append
        ? [...projects, ...incoming.filter((item) => !projects.some((project) => String(project.id) === String(item.id)))]
        : incoming;
      pagination = {
        page: Number(result.pagination?.page) || nextPage,
        total: Number(result.pagination?.total) || projects.length,
        totalPages: Number(result.pagination?.totalPages) || 1
      };
      render();
      const visible = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value) visible.set(key, value); });
      history.replaceState(null, '', `${location.pathname}${visible.size ? `?${visible}` : ''}${location.hash}`);
      if (scroll) $('#projects')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (append && projects.length) {
        const wrap = paginationControl();
        const button = $('[data-load-more-projects]', wrap);
        const status = $('[role="status"]', wrap);
        if (button) { button.disabled = false; button.textContent = 'Try Loading More Again'; }
        if (status) status.textContent = error.message || 'Unable to load more projects.';
      } else {
        projects = [];
        pagination = { page: 1, total: 0, totalPages: 1 };
        grid.innerHTML = `<div class="empty" role="status"><strong>${esc(error.message)}</strong><br><button class="btn btn-dark" data-project-retry>Try Again</button></div>`;
        updatePagination();
      }
    }
  }
  function open(id = '', context) {
    const modal = $('#enquiry-modal');
    if (!modal) return;
    const project = projects.find((item) => String(item.id) === String(id));
    const projectField = modal.querySelector('[name="project"]');
    const nameField = modal.querySelector('[name="project_name"]');
    const locationField = modal.querySelector('[name="location"]');
    const typeField = modal.querySelector('[name="type"]');
    if (projectField) projectField.value = id;
    if (nameField) nameField.value = context?.dataset.projectName || project?.name || '';
    if (locationField && !locationField.value) locationField.value = context?.dataset.projectLocation || project?.city || '';
    if (typeField && !typeField.value) typeField.value = context?.dataset.projectType || project?.configuration || '';
    modal.showModal();
  }
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
      const contextLines = [
        values.project ? `Project ID: ${values.project}` : '',
        values.project_name ? `Project: ${values.project_name}` : '',
        values.type ? `Preferred configuration: ${values.type}` : ''
      ];
      const response = await fetch(`${api}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: values.name, phone: values.phone || values.mobile, email: values.email, project_id: values.project || undefined, inquiry_type: values.type || undefined, location: values.location, budget: values.budget, requirement: 'Project enquiry', message: [values.message, ...contextLines].filter(Boolean).join('\n'), source: 'new-projects-page' }) });
      const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.message || 'Unable to submit request.');
      $('.form-status', form).textContent = result.message || 'Thank you. Your request has been submitted.'; form.reset();
    } catch (error) { const status = $('.form-status', form); status.textContent = error.message; status.style.color = '#b42318'; }
    finally { button.disabled = false; button.textContent = label; }
  }
  document.addEventListener('click', (event) => {
    const quick = event.target.closest('[data-project-filter]');
    if (quick) { $$('[data-project-filter]').forEach((item) => item.classList.remove('active')); quick.classList.add('active'); const field = $('#project-search')?.elements[quick.dataset.field || 'status']; if (field) field.value = quick.dataset.projectFilter; load(true); }
    const enquiry = event.target.closest('[data-project-enquire]'); if (enquiry) open(enquiry.dataset.projectEnquire, enquiry);
    if (event.target.closest('[data-project-modal-close]')) $('#enquiry-modal')?.close();
    if (event.target.closest('#compare-now')) compare();
    if (event.target.closest('[data-clear-projects]')) { $('#project-search')?.reset(); setTimeout(() => load(), 0); }
    if (event.target.closest('[data-project-retry]')) load();
    if (event.target.closest('[data-load-more-projects]')) load(false, true);
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
