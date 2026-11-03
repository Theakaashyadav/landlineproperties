(function () {
  'use strict';

  const regions = {
    'delhi-ncr': {
      name: 'Delhi NCR',
      locations: ['Gurgaon', 'Noida', 'Greater Noida', 'Delhi', 'Faridabad', 'Ghaziabad'],
      aliases: ['delhi ncr', 'delhi-ncr', 'delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida', 'greater noida', 'faridabad', 'ghaziabad'],
      caption: 'Explore city homes, villas and plots across Delhi NCR. Choose a location, property type and budget to begin.'
    },
    uttarakhand: {
      name: 'Uttarakhand',
      locations: ['Dehradun', 'Mussoorie', 'Nainital', 'Rishikesh', 'Haridwar', 'Haldwani', 'Bhimtal', 'Mukteshwar', 'Naukuchiatal', 'Ramnagar', 'Almora'],
      aliases: ['uttarakhand', 'dehradun', 'mussoorie', 'nainital', 'rishikesh', 'haridwar', 'haldwani', 'bhimtal', 'mukteshwar', 'naukuchiatal', 'ramnagar', 'almora'],
      caption: 'Explore homes, holiday retreats and land in Uttarakhand. Choose your preferred town, property type and budget.'
    }
  };
  const budgets = [
    { value: '', label: 'Any budget', min: 0, max: 0 },
    { value: '25', label: 'Up to ₹25 Lakh', min: 0, max: 2500000 },
    { value: '50', label: '₹25–50 Lakh', min: 2500000, max: 5000000 },
    { value: '100', label: '₹50 Lakh–1 Cr', min: 5000000, max: 10000000 },
    { value: '200', label: '₹1–2 Cr', min: 10000000, max: 20000000 },
    { value: '200+', label: '₹2 Cr+', min: 20000000, max: 0 }
  ];
  const propertyTypes = [
    { value: '', label: 'All property types' },
    ...['Apartment', 'Villa', 'Plot', 'Independent House', 'Builder Floor', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land']
      .map(value => ({ value, label: value }))
  ];

  function resolveRegion(value, locationValue = '') {
    const explicit = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
    if (Object.hasOwn(regions, explicit)) return explicit;
    const location = String(locationValue || '').trim().toLowerCase();
    return regions.uttarakhand.aliases.includes(location) ? 'uttarakhand' : 'delhi-ncr';
  }

  function resolveLocation(regionKey, value) {
    const location = String(value || '').trim();
    const normalized = location.toLowerCase();
    if (!location || /^all locations$/i.test(location) || ['uttarakhand', 'delhi ncr', 'delhi-ncr'].includes(normalized)) return '';
    const region = regions[regionKey];
    if (!region) return '';
    const otherRegion = regions[regionKey === 'uttarakhand' ? 'delhi-ncr' : 'uttarakhand'];
    if (otherRegion.aliases.includes(normalized)) return '';
    if (normalized === 'gurugram') return 'Gurgaon';
    if (normalized === 'new delhi') return 'Delhi';
    return region.locations.find(city => city.toLowerCase() === normalized) || location;
  }

  window.LandlineSearchConfig = { regions, budgets, propertyTypes, resolveRegion, resolveLocation };
})();
