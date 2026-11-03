(function () {
  'use strict';

  const SEARCH = window.LandlineSearchConfig;
  const REGION_PRESENTATION = {
    'delhi-ncr': {
      kicker: 'City living, your way',
      description: 'Explore homes, plots and spaces across Delhi NCR. Search by neighbourhood, property type and budget to find your next move.',
      fallback: 'image/home/modern-residence.jpg',
      collections: []
    },
    uttarakhand: {
      kicker: 'A little closer to nature',
      description: 'Explore homes, holiday retreats and land across Uttarakhand. Find your preferred town, property type and budget, all in one place.',
      fallback: 'image/home/hillside-retreat.jpg',
      collections: []
    }
  };
  const REGIONS = Object.fromEntries(Object.entries(REGION_PRESENTATION).map(([key, presentation]) => [key, { ...SEARCH.regions[key], ...presentation }]));
  const FILTERS = ['q', 'location', 'type', 'budget', 'bhk', 'area', 'furnishing', 'status'];
  const LABELS = { q: 'Search', location: 'Location', type: 'Type', budget: 'Budget', bhk: 'Bedrooms', area: 'Minimum area', furnishing: 'Furnishing', status: 'Status' };
  const BUDGETS = Object.fromEntries(SEARCH.budgets.filter(budget => budget.value).map(budget => [budget.value, [budget.min, budget.max]]));
  const PAGE_SIZE = 12;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const localPreview = location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '5000');
  const origin = String(window.LANDLINE_API_ORIGIN || (localPreview ? 'http://localhost:5000' : location.origin)).replace(/\/$/, '');

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('region-search');
    const grid = document.getElementById('region-property-grid');
    if (!form || !grid) return;

    const count = document.getElementById('region-result-count');
    const sort = document.getElementById('region-sort');
    const chips = document.getElementById('region-active-filters');
    const note = document.getElementById('region-inventory-note');
    const feedback = document.getElementById('region-feedback');
    const formStatus = document.getElementById('region-search-status');
    const loadMore = document.getElementById('region-load-more');
    let selected = readUrl();
    let properties = [];
    let pagination = { page: 1, total: 0, totalPages: 0 };
    let requestController;
    let requestNumber = 0;

    function readUrl() {
      const params = new URLSearchParams(location.search);
      const locationName = (params.get('location') || '').trim();
      const region = SEARCH.resolveRegion(params.get('region'), locationName);
      const values = { region, sort: ['newest', 'price_low', 'price_high'].includes(params.get('sort')) ? params.get('sort') : 'newest' };
      FILTERS.forEach(key => { values[key] = (params.get(key) || '').trim(); });
      values.location = SEARCH.resolveLocation(region, values.location);
      if (/^all types$/i.test(values.type)) values.type = '';
      if (/^any budget$/i.test(values.budget)) values.budget = '';
      values.type = { Residential: 'Apartment', 'Plot/Land': 'Plot' }[values.type] || values.type;
      if (values.type === 'New Project') { values.type = ''; values.status = 'New Launch'; }
      if (values.budget === 'custom') {
        values.customBudget = (params.get('customBudget') || '').trim();
        values.budgetUnit = (params.get('budgetUnit') || '').trim();
      }
      return values;
    }

    function regionInfo() { return REGIONS[selected.region]; }
    function usesProjectCatalog() { return ['delhi-ncr', 'uttarakhand'].includes(selected.region); }
    function hasFilters(values = selected) { return FILTERS.some(key => Boolean(values[key])); }
    function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
    function setNote(text = '') { if (note) { note.textContent = text; note.hidden = !text; } }
    function setFeedback(text = '', retry = false) {
      if (!feedback) return;
      feedback.hidden = !text;
      feedback.innerHTML = text ? `<span>${escapeHtml(text)}</span>${retry ? ' <button type="button" data-region-retry>Try again</button>' : ''}` : '';
    }

    function updatePage() {
      const region = regionInfo();
      setText('region-title', `Properties in ${region.name}`);
      setText('region-description', region.description);
      setText('region-kicker', region.kicker);
      document.querySelectorAll('[data-region-name]').forEach(element => { element.textContent = region.name; });
      document.title = `Properties in ${region.name} | Landline Properties`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', region.description);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://landlineproperties.com/featured-properties.html?region=${selected.region}`);
      document.body.dataset.region = selected.region;
      document.querySelectorAll('[data-region-link]').forEach(link => {
        const active = link.dataset.regionLink === selected.region;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      document.querySelectorAll('.region-shortlist a[href]').forEach(link => {
        link.href = `contact.html?requirement=location-assistance&location=${encodeURIComponent(selected.location || region.name)}`;
      });
      const locationField = form.elements.location;
      if (locationField) {
        locationField.replaceChildren(new Option(`All ${region.name} locations`, ''), ...region.locations.map(value => new Option(value, value)));
        if (selected.location && !region.locations.includes(selected.location)) locationField.add(new Option(selected.location, selected.location));
      }
      if (form.elements.type) form.elements.type.replaceChildren(...SEARCH.propertyTypes.map(option => new Option(option.label, option.value)));
      if (form.elements.budget) form.elements.budget.replaceChildren(...SEARCH.budgets.map(option => new Option(option.label, option.value)));
      FILTERS.forEach(key => {
        const control = form.elements[key];
        if (!control) return;
        if (control instanceof HTMLSelectElement && selected[key] && ![...control.options].some(option => option.value === selected[key])) {
          control.add(new Option(selected[key] === 'custom' ? 'Custom budget' : selected[key], selected[key]));
        }
        control.value = selected[key] || '';
      });
      if (form.elements.region) form.elements.region.value = selected.region;
      if (sort) sort.value = selected.sort;
      const moreFilters = document.getElementById('more-filters');
      if (moreFilters && ['area', 'furnishing', 'status'].some(key => selected[key])) moreFilters.open = true;
      renderChips();
      document.dispatchEvent(new CustomEvent('regionfilterschange', { detail: { region: selected.region } }));
    }

    function formValues() {
      const values = { region: selected.region, sort: sort?.value || 'newest' };
      FILTERS.forEach(key => { values[key] = String(form.elements[key]?.value || '').trim(); });
      if (values.budget === 'custom') { values.customBudget = selected.customBudget; values.budgetUnit = selected.budgetUnit; }
      return values;
    }

    function updateUrl(push = false) {
      const params = new URLSearchParams({ region: selected.region });
      FILTERS.forEach(key => { if (selected[key]) params.set(key, selected[key]); });
      if (selected.sort !== 'newest') params.set('sort', selected.sort);
      if (selected.budget === 'custom') {
        if (selected.customBudget) params.set('customBudget', selected.customBudget);
        if (selected.budgetUnit) params.set('budgetUnit', selected.budgetUnit);
      }
      const url = `${location.pathname}?${params}${location.hash}`;
      if (url !== `${location.pathname}${location.search}${location.hash}`) history[push ? 'pushState' : 'replaceState'](null, '', url);
    }

    function renderChips() {
      if (!chips) return;
      chips.innerHTML = FILTERS.filter(key => selected[key]).map(key => {
        const control = form.elements[key];
        const value = control instanceof HTMLSelectElement ? control.selectedOptions[0]?.textContent || selected[key] : selected[key];
        return `<button class="region-filter-chip" type="button" data-remove-region-filter="${key}" aria-label="Remove ${escapeHtml(LABELS[key])} filter: ${escapeHtml(value)}">${escapeHtml(LABELS[key])}: ${escapeHtml(value)} <span aria-hidden="true">&times;</span></button>`;
      }).join('');
      chips.hidden = !hasFilters();
      document.querySelectorAll('[data-clear-region-filters]').forEach(button => { if (!button.closest('.region-empty')) button.hidden = !hasFilters(); });
    }

    function apiQuery(pageNumber) {
      const params = new URLSearchParams({ region: selected.region, purpose: 'Buy', limit: String(PAGE_SIZE), page: String(pageNumber), sort: selected.sort });
      ['q', 'location', 'type', 'bhk'].forEach(key => { if (selected[key]) params.set(key, selected[key]); });
      if (selected.area) params.set('min_area', selected.area);
      if (selected.furnishing) params.set('furnishing', selected.furnishing === 'Furnished' ? 'Fully Furnished' : selected.furnishing);
      if (selected.status === 'New Launch') params.set('new_launch', 'true');
      else if (selected.status) params.set('property_status', selected.status);
      if (BUDGETS[selected.budget]) {
        const [minimum, maximum] = BUDGETS[selected.budget];
        if (minimum) params.set('min_price', String(minimum));
        if (maximum) params.set('max_price', String(maximum));
      } else if (selected.budget === 'custom') {
        const amount = Number(String(selected.customBudget || '').replace(/,/g, ''));
        const unit = String(selected.budgetUnit || '').toLowerCase();
        const multiplier = ['cr', 'crore'].includes(unit) ? 1e7 : unit === 'lakh' ? 1e5 : 1;
        if (Number.isFinite(amount) && amount > 0) params.set('max_price', String(amount * multiplier));
      }
      return params;
    }

    function price(property) {
      if (property.price_label) return escapeHtml(property.price_label);
      const amount = Number(property.price);
      if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
      const value = amount >= 1e7 ? `&#8377;${Number((amount / 1e7).toFixed(2))} Cr`
        : amount >= 1e5 ? `&#8377;${Number((amount / 1e5).toFixed(2))} Lakh` : `&#8377;${amount.toLocaleString('en-IN')}`;
      return property.purpose === 'Rent' ? `${value} / month` : value;
    }

    function imageUrl(value) {
      const path = String(value || '').trim();
      return !path ? regionInfo().fallback : /^https?:\/\//i.test(path) ? path : `${origin}/${path.replace(/^\/+/, '')}`;
    }

    function card(property) {
      const title = escapeHtml(property.title || 'Property details');
      const detailsUrl = `property-details.html?slug=${encodeURIComponent(property.slug || '')}`;
      const enquiryUrl = `contact.html?property=${encodeURIComponent(property.id)}&location=${encodeURIComponent(property.city || regionInfo().name)}`;
      const badge = property.featured ? 'Featured' : property.new_launch ? 'New launch' : property.property_status || 'For sale';
      const specifications = [property.bhk, property.area ? `${Number(property.area).toLocaleString('en-IN')} ${property.area_unit || 'Sq.Ft.'}` : '', property.property_type, property.furnishing].filter(Boolean);
      return `<article class="regional-card"><div class="regional-card-media"><a href="${detailsUrl}" aria-label="View ${title}"><img src="${escapeHtml(imageUrl(property.cover_image))}" alt="${escapeHtml(property.cover_image ? `${property.title} in ${property.city || regionInfo().name}` : `Representative home image for ${property.title}`)}" width="900" height="620" loading="lazy" decoding="async"></a><span class="regional-card-badge">${escapeHtml(badge)}</span>${!property.cover_image ? '<span class="regional-image-note">Representative image</span>' : ''}</div><div class="regional-card-body"><p class="regional-card-location">${escapeHtml([property.locality, property.city].filter(Boolean).join(', ') || regionInfo().name)}</p><h3 class="regional-card-title"><a href="${detailsUrl}">${title}</a></h3><div class="regional-card-specs">${specifications.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div><p class="regional-card-description">${escapeHtml(property.short_description || 'Request current details and arrange a property visit.')}</p><div class="regional-card-footer"><p class="regional-card-price">${price(property)}</p><a class="regional-card-action" href="${detailsUrl}">View details <span aria-hidden="true">&#8599;</span></a></div><a class="regional-card-enquire" href="${enquiryUrl}">Enquire now <span aria-hidden="true">&#8599;</span></a></div></article>`;
    }

    function collectionCard(collection) {
      const enquiryUrl = `contact.html?location=${encodeURIComponent(collection.location)}&requirement=Buy%20Property`;
      const regionName = regionInfo().name;
      const locationLabel = escapeHtml(collection.location) + (collection.location === regionName ? '' : ` &middot; ${escapeHtml(regionName)}`);
      return `<article class="regional-card regional-card-collection" data-representative-collection><div class="regional-card-media"><a href="${enquiryUrl}" aria-label="Request current options for ${escapeHtml(collection.title)}"><img src="${collection.image}" alt="Representative lifestyle image for ${escapeHtml(collection.title)}" width="900" height="620" loading="lazy" decoding="async"></a><span class="regional-card-badge">Explore collection</span><span class="regional-image-note">Representative image</span></div><div class="regional-card-body"><p class="regional-card-location">${locationLabel}</p><h3 class="regional-card-title"><a href="${enquiryUrl}">${escapeHtml(collection.title)}</a></h3><div class="regional-card-specs">${collection.types.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div><p class="regional-card-description">${escapeHtml(collection.description)}</p><div class="regional-card-footer"><span class="regional-card-category">Property collection</span><a class="regional-card-action" href="${enquiryUrl}">Request current options <span aria-hidden="true">&#8599;</span></a></div></div></article>`;
    }

    function projectCard(project) {
      const title = escapeHtml(project.name);
      const detailsUrl = `project-details.html?slug=${encodeURIComponent(project.slug)}`;
      const enquiryUrl = `contact.html?project=${encodeURIComponent(project.slug)}&requirement=project-enquiry&location=${encodeURIComponent([project.locality, project.city].filter(Boolean).join(', '))}`;
      const specifications = [project.configuration, project.property_type].filter(Boolean);
      return `<article class="regional-card" data-project-catalog><div class="regional-card-media"><a href="${detailsUrl}" aria-label="View ${title}"><img src="${escapeHtml(imageUrl(project.image))}" alt="${escapeHtml(project.image_alt || project.name)}" width="900" height="620" loading="lazy" decoding="async"></a><span class="regional-card-badge">${escapeHtml(project.project_status || 'Residential project')}</span>${project.image_note ? `<span class="regional-image-note">${escapeHtml(project.image_note)}</span>` : ''}</div><div class="regional-card-body"><p class="regional-card-location">${escapeHtml([project.locality, project.city].filter(Boolean).join(', '))}</p><h3 class="regional-card-title"><a href="${detailsUrl}">${title}</a></h3><div class="regional-card-specs">${specifications.map(value => `<span>${escapeHtml(value)}</span>`).join('')}</div><p class="regional-card-description">${escapeHtml(project.short_description || project.description)}</p><div class="regional-card-footer"><p class="regional-card-price">${price(project)}</p><a class="regional-card-action" href="${detailsUrl}">View details <span aria-hidden="true">&#8599;</span></a></div><a class="regional-card-enquire" href="${enquiryUrl}">Enquire now <span aria-hidden="true">&#8599;</span></a></div></article>`;
    }

    function selectedProjects() {
      return usesProjectCatalog() ? window.LandlineProjects?.select?.(selected) || [] : [];
    }

    function projectStatus() {
      const total = selectedProjects().length;
      return total ? `${total} ${total === 1 ? 'project' : 'projects'} found.` : 'No projects match these filters.';
    }

    function renderProjects() {
      const projects = selectedProjects();
      if (!projects.length && !properties.length) {
        emptyState();
        return;
      }
      grid.dataset.inventoryState = properties.length ? 'live' : 'catalog';
      grid.innerHTML = projects.map(projectCard).join('') + properties.map(card).join('');
      if (count) {
        const projectCount = `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`;
        const propertyCount = pagination.total > properties.length ? `Showing ${properties.length} of ${pagination.total} properties` : `${pagination.total} ${pagination.total === 1 ? 'property' : 'properties'}`;
        count.textContent = properties.length ? `${projectCount} · ${propertyCount}` : projectCount;
      }
      setNote('');
      if (loadMore) loadMore.hidden = !(properties.length && pagination.page < pagination.totalPages && properties.length < pagination.total);
    }

    function showCollections() {
      if (usesProjectCatalog()) {
        renderProjects();
        return;
      }
      grid.dataset.inventoryState = 'browse';
      grid.innerHTML = regionInfo().collections.map(collectionCard).join('');
      if (count) count.textContent = 'Explore property collections';
      setNote('Representative property collections. Images are illustrative; request current listings and availability.');
      if (loadMore) loadMore.hidden = true;
    }

    function emptyState(unavailable = false) {
      const projectCatalog = usesProjectCatalog();
      grid.dataset.inventoryState = unavailable ? 'unavailable' : 'empty';
      const enquiry = `contact.html?location=${encodeURIComponent(selected.location || regionInfo().name)}&requirement=Buy%20Property`;
      grid.innerHTML = `<div class="region-empty" role="status"><span class="region-empty-icon" aria-hidden="true">&#8962;</span><h3>${unavailable ? 'Current listings are temporarily unavailable' : projectCatalog ? 'No matching projects' : 'No matching properties yet'}</h3><p>${unavailable ? 'Please try again or share your requirements for a current shortlist.' : 'Try a different location or fewer filters, or tell us what you are looking for.'}</p><div class="region-empty-actions">${unavailable ? '<button type="button" class="btn btn-dark" data-region-retry>Try again</button>' : '<button type="button" class="btn" data-clear-region-filters>Clear filters</button>'}<a class="btn btn-dark" href="${enquiry}">Request a shortlist &#8599;</a></div></div>`;
      if (count) count.textContent = unavailable ? 'Listings unavailable' : projectCatalog ? '0 projects' : '0 properties';
      setNote('');
      if (loadMore) loadMore.hidden = true;
    }

    function render() {
      setFeedback('');
      if (usesProjectCatalog()) {
        renderProjects();
        return;
      }
      if (!properties.length) {
        if (hasFilters()) emptyState();
        else showCollections();
        return;
      }
      grid.dataset.inventoryState = 'live';
      grid.innerHTML = properties.map(card).join('');
      if (count) count.textContent = pagination.total > properties.length ? `Showing ${properties.length} of ${pagination.total} properties` : `${pagination.total} ${pagination.total === 1 ? 'property' : 'properties'}`;
      setNote('');
      if (loadMore) loadMore.hidden = !(pagination.page < pagination.totalPages && properties.length < pagination.total);
    }

    async function load(append = false) {
      requestController?.abort();
      requestController = new AbortController();
      const controller = requestController;
      const currentRequest = ++requestNumber;
      const nextPage = append ? pagination.page + 1 : 1;
      grid.setAttribute('aria-busy', 'true');
      if (formStatus) formStatus.textContent = 'Searching current properties…';
      setFeedback('');
      if (loadMore) { loadMore.disabled = true; loadMore.textContent = append ? 'Loading…' : 'Load more properties'; }
      if (!append) {
        properties = [];
        pagination = { page: 1, total: 0, totalPages: 0 };
        if (usesProjectCatalog() || !hasFilters()) showCollections();
        else {
          grid.innerHTML = '<div class="region-skeleton" role="status">Searching current properties…</div>';
          if (count) count.textContent = 'Searching properties…';
          setNote('');
          if (loadMore) loadMore.hidden = true;
        }
      }
      try {
        const response = await fetch(`${origin}/api/properties?${apiQuery(nextPage)}`, { signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result) throw new Error('Current listings could not be loaded.');
        if (currentRequest !== requestNumber) return;
        const incoming = Array.isArray(result.data) ? result.data : [];
        properties = append ? [...properties, ...incoming.filter(item => !properties.some(property => String(property.id) === String(item.id)))] : incoming;
        pagination = {
          page: Number(result.pagination?.page) || nextPage,
          total: Number(result.pagination?.total) || properties.length,
          totalPages: Number(result.pagination?.totalPages) || (properties.length ? 1 : 0)
        };
        render();
        if (formStatus) formStatus.textContent = usesProjectCatalog() ? `${projectStatus()}${properties.length ? ` ${pagination.total} properties found.` : ''}` : properties.length ? `${pagination.total} properties found.` : hasFilters() ? 'No published properties match these filters.' : 'Explore collections and request current availability.';
      } catch (error) {
        if (error.name === 'AbortError' || currentRequest !== requestNumber) return;
        if (append && properties.length) {
          setFeedback('More properties could not be loaded. Please try again.', true);
          if (loadMore) loadMore.hidden = false;
        } else if (usesProjectCatalog()) showCollections();
        else if (hasFilters()) emptyState(true);
        else {
          showCollections();
          setFeedback('Current listings could not be loaded. Explore collections below or try again.', true);
        }
        if (formStatus) formStatus.textContent = usesProjectCatalog() ? projectStatus() : 'Current listings could not be loaded. Please try again.';
      } finally {
        if (currentRequest === requestNumber) {
          grid.removeAttribute('aria-busy');
          if (loadMore) { loadMore.disabled = false; loadMore.textContent = 'Load more properties'; }
        }
      }
    }

    function applyFilters() {
      selected = formValues();
      updateUrl(true);
      renderChips();
      load();
    }

    function clearFilters() {
      const region = selected.region;
      selected = { region, sort: 'newest' };
      FILTERS.forEach(key => { selected[key] = ''; });
      form.reset();
      updatePage();
      updateUrl(true);
      load();
    }

    form.addEventListener('submit', event => { event.preventDefault(); applyFilters(); });
    form.addEventListener('change', event => { if (event.target instanceof HTMLSelectElement) applyFilters(); });
    form.addEventListener('reset', event => { event.preventDefault(); });
    sort?.addEventListener('change', applyFilters);
    loadMore?.addEventListener('click', () => load(true));
    document.addEventListener('click', event => {
      const clear = event.target.closest('[data-clear-region-filters]');
      if (clear) { event.preventDefault(); clearFilters(); return; }
      const remove = event.target.closest('[data-remove-region-filter]');
      if (remove) {
        const key = remove.dataset.removeRegionFilter;
        if (FILTERS.includes(key)) {
          selected = formValues();
          selected[key] = '';
          if (key === 'budget') { delete selected.customBudget; delete selected.budgetUnit; }
          updatePage();
          updateUrl(true);
          load();
        }
        return;
      }
      if (event.target.closest('[data-region-retry]')) load(Boolean(properties.length && grid.dataset.inventoryState === 'live'));
    });
    grid.addEventListener('error', event => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied) return;
      image.dataset.fallbackApplied = 'true';
      image.src = regionInfo().fallback;
      image.alt = 'Representative property image';
      const media = image.closest('.regional-card-media');
      if (media && !media.querySelector('.regional-image-note')) {
        const label = document.createElement('span');
        label.className = 'regional-image-note';
        label.textContent = 'Representative image';
        media.appendChild(label);
      }
    }, true);
    window.addEventListener('popstate', () => { selected = readUrl(); updatePage(); load(); });
    updatePage();
    updateUrl();
    load();
  });
})();
