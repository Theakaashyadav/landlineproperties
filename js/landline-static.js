(function () {
  'use strict';

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
    if (context.length && form.elements.message && !form.elements.message.value) {
      form.elements.message.value = context.join('\n');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-landline-lead-form]').forEach(prefillLeadForm);
  });
})();
