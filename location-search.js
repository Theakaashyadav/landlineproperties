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

  const budgetOptions = {
    Buy: [
      ['', 'Any budget'], ['25', 'Up to ₹25 Lakh'], ['50', '₹25–50 Lakh'],
      ['100', '₹50 Lakh–₹1 Cr'], ['200', '₹1–2 Cr'], ['200+', '₹2 Cr+']
    ],
    Investment: [
      ['', 'Any budget'], ['25', 'Up to ₹25 Lakh'], ['50', '₹25–50 Lakh'],
      ['100', '₹50 Lakh–₹1 Cr'], ['200', '₹1–2 Cr'], ['200+', '₹2 Cr+']
    ],
    Rent: [
      ['', 'Any monthly rent'], ['40000', 'Up to ₹40,000'], ['70000', 'Up to ₹70,000'],
      ['120000', 'Up to ₹1.20 Lakh'], ['250000', 'Up to ₹2.50 Lakh']
    ],
    'New Projects': [
      ['', 'Any budget'], ['under-50', 'Under ₹50 Lakh'], ['50-100', '₹50 Lakh–₹1 Cr'],
      ['1-2', '₹1–2 Cr'], ['2+', '₹2 Cr+']
    ]
  };

  function syncSearchForPurpose(form) {
    const looking = form.elements.looking.value;
    const budget = form.elements.budget;
    const type = form.elements.type;
    const previousBudget = budget.value;
    budget.innerHTML = (budgetOptions[looking] || budgetOptions.Buy)
      .map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    if ([...budget.options].some((option) => option.value === previousBudget)) budget.value = previousBudget;
    const budgetWidget = budget.nextElementSibling?.classList.contains('smart-select') ? budget.nextElementSibling : null;
    if (budgetWidget) {
      const list = budgetWidget.querySelector('.smart-select__options');
      const trigger = budgetWidget.querySelector('.smart-select__trigger');
      list.innerHTML = '';
      [...budget.options].forEach((option, optionIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `smart-select__option${optionIndex === budget.selectedIndex ? ' is-selected' : ''}`;
        button.dataset.index = String(optionIndex);
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(optionIndex === budget.selectedIndex));
        button.textContent = option.textContent;
        button.addEventListener('click', () => {
          budget.selectedIndex = optionIndex;
          budget.dispatchEvent(new Event('change', { bubbles: true }));
          budgetWidget.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        });
        list.appendChild(button);
      });
      budget.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (type) {
      type.disabled = looking === 'New Projects';
      type.title = looking === 'New Projects' ? 'Use the configuration filter on the projects page.' : '';
      if (type.disabled) type.value = '';
      const typeWidget = type.nextElementSibling?.classList.contains('smart-select') ? type.nextElementSibling : null;
      const typeTrigger = typeWidget?.querySelector('.smart-select__trigger');
      if (typeTrigger) {
        typeTrigger.disabled = type.disabled;
        typeTrigger.title = type.title;
      }
    }
  }

  function route(form) {
    const fields = Object.fromEntries(new FormData(form));
    const pages = { Buy: 'featured-properties.html', Rent: 'rent.html', Investment: 'investment.html', 'New Projects': 'new-projects.html' };
    const query = new URLSearchParams();
    if (fields.location) query.set('location', fields.location);
    if (fields.type && fields.looking !== 'New Projects') query.set('type', fields.type);
    if (fields.budget) query.set('budget', fields.budget);
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

    const searchForm = $('#location-search');
    if (searchForm) {
      syncSearchForPurpose(searchForm);
      searchForm.elements.looking.addEventListener('change', () => syncSearchForPurpose(searchForm));
      searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        route(event.target);
      });
    }
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
