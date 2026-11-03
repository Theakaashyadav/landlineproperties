(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('home-search');
    if (!form) return;
    const config = window.LandlineSearchConfig;
    const regionField = document.getElementById('property-region');
    const locationField = document.getElementById('property-location');
    const typeField = document.getElementById('property-type');
    const budgetField = document.getElementById('property-budget');
    const keywordField = document.getElementById('property-keyword');
    if (!config || !regionField || !locationField || !typeField || !budgetField) return;

    const params = new URLSearchParams(window.location.search);
    let selectedRegion = config.resolveRegion(params.get('region') || (params.has('location') ? '' : regionField.value), params.get('location'));
    const initialType = { Residential: 'Apartment', 'Plot/Land': 'Plot' }[params.get('type')] || params.get('type') || '';
    const initialBudget = params.get('budget') || '';
    typeField.replaceChildren(...config.propertyTypes.map(option => new Option(option.label, option.value)));
    budgetField.replaceChildren(...config.budgets.map(option => new Option(option.label, option.value)));
    typeField.value = config.propertyTypes.some(option => option.value === initialType) ? initialType : '';
    budgetField.value = config.budgets.some(option => option.value === initialBudget) ? initialBudget : '';
    if (keywordField) keywordField.value = params.get('q') || '';

    function setRegion(regionKey, preferredLocation = locationField.value) {
      selectedRegion = config.resolveRegion(regionKey);
      const region = config.regions[selectedRegion];
      const location = config.resolveLocation(selectedRegion, preferredLocation);
      regionField.value = selectedRegion;
      locationField.replaceChildren(new Option(`All ${region.name} locations`, ''), ...region.locations.map(city => new Option(city, city)));
      locationField.value = region.locations.includes(location) ? location : '';
      const locationLabel = document.getElementById('home-location-label');
      if (locationLabel) locationLabel.textContent = `Location in ${region.name}`;
      document.querySelectorAll('button[data-home-region]').forEach(button => {
        const active = button.dataset.homeRegion === selectedRegion;
        button.type = 'button';
        button.classList.toggle('active', active);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      document.querySelectorAll('[data-home-search-caption]').forEach(element => { element.textContent = region.caption; });
      document.body.dataset.homeRegion = selectedRegion;
      document.dispatchEvent(new CustomEvent('homeregionchange', { detail: { region: selectedRegion } }));
    }

    document.querySelectorAll('button[data-home-region]').forEach(button => {
      button.addEventListener('click', () => setRegion(button.dataset.homeRegion));
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const query = new URLSearchParams({ region: selectedRegion });
      const values = { q: keywordField?.value.trim() || '', location: locationField.value, type: typeField.value, budget: budgetField.value };
      Object.entries(values).forEach(([key, value]) => { if (value) query.set(key, value); });
      window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
      window.location.assign(`featured-properties.html?${query}`);
    });

    setRegion(selectedRegion, params.get('location') || '');
  });
})();
