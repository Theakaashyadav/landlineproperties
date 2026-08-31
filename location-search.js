(function () {
  const $ = (selector, context = document) => context.querySelector(selector);

  // Add the option before the shared dropdown enhancer initializes.
  const dataList = $('#location-list');
  if (dataList && !dataList.querySelector('option[value="Uttarakhand"]')) {
    dataList.insertAdjacentHTML('beforeend', '<option value="Uttarakhand">');
  }
  const locationSelect = $('#location-search select[name="location"]');
  if (locationSelect && ![...locationSelect.options].some((option) => option.value === 'Uttarakhand')) {
    locationSelect.add(new Option('Uttarakhand', 'Uttarakhand'));
  }

  function route(form) {
    const fields = Object.fromEntries(new FormData(form));
    const pages = { Buy: 'featured-properties.html', Rent: 'rent.html', Investment: 'investment.html', 'New Projects': 'new-projects.html' };
    const query = new URLSearchParams();
    if (fields.location) query.set('location', fields.location);
    if (fields.type) query.set('type', fields.type);
    if (fields.budget) {
      const projectBudgets = { 50: 'under-50', 100: '50-100', 200: '1-2' };
      query.set('budget', fields.looking === 'New Projects' ? (projectBudgets[fields.budget] || fields.budget) : fields.budget);
    }
    location.href = `${pages[fields.looking] || 'featured-properties.html'}?${query}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const majorLocations = $('#major-locations .container');
    if (majorLocations && !$('#uttarakhand')) {
      majorLocations.insertAdjacentHTML('beforeend', `
        <div class="location-feature" id="uttarakhand">
          <img src="image/home-hero-luxury-delhi-ncr.png" alt="Premium property in Uttarakhand" loading="lazy">
          <div><span class="eyebrow">Uttarakhand</span>
            <h2>Holiday homes, villas and scenic investment destinations</h2>
            <p>Explore residential, holiday-home and plotted opportunities across Uttarakhand's growing lifestyle markets.</p>
            <div class="location-actions">
              <a class="btn" href="featured-properties.html?location=Uttarakhand">Buy</a>
              <a class="btn" href="rent.html?location=Uttarakhand">Rent</a>
              <a class="btn" href="new-projects.html?location=Uttarakhand">New Projects</a>
              <a class="btn btn-dark" href="featured-properties.html?location=Uttarakhand">Explore Uttarakhand</a>
            </div>
          </div>
        </div>`);
    }

    const localityGrid = $('.locality-groups');
    if (localityGrid && !localityGrid.querySelector('[data-location="uttarakhand"]')) {
      localityGrid.insertAdjacentHTML('beforeend', `
        <article class="locality-group" data-location="uttarakhand"><h3>Uttarakhand</h3>
          <a href="featured-properties.html?location=Uttarakhand">Dehradun</a>
          <a href="featured-properties.html?location=Uttarakhand">Mussoorie</a>
          <a href="featured-properties.html?location=Uttarakhand">Nainital</a>
          <a href="featured-properties.html?location=Uttarakhand">Rishikesh</a>
        </article>`);
    }

    const comparisonBody = $('.comparison tbody');
    if (comparisonBody && !comparisonBody.querySelector('[data-location="uttarakhand"]')) {
      comparisonBody.insertAdjacentHTML('beforeend', '<tr data-location="uttarakhand"><th>Uttarakhand</th><td>Holiday homes, villas, plots</td><td>Accessibility, land-use rules, title and seasonal demand</td></tr>');
    }

    $('#location-search')?.addEventListener('submit', (event) => {
      event.preventDefault();
      route(event.target);
    });
    $('#hero-location-search')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = event.target.elements.location.value.trim();
      location.href = value ? `locations.html#${encodeURIComponent(value.toLowerCase().replace(/\s+/g, '-'))}` : '#major-locations';
    });
    document.querySelectorAll('[data-location-enquire]').forEach((button) => {
      button.addEventListener('click', () => { location.href = 'contact.html?requirement=location-assistance'; });
    });
  });
})();
