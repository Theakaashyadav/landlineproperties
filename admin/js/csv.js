(function initAdminCsv(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdminCsv = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAdminCsv() {
  'use strict';

  function neutralizeFormula(value) {
    const text = String(value ?? '').replace(/\u0000/g, '');
    const firstVisible = text.replace(/^[\s\u0001-\u001f]+/, '').charAt(0);
    return /^[=+\-@]$/.test(firstVisible) ? `'${text}` : text;
  }

  function cell(value) {
    return `"${neutralizeFormula(value).replace(/"/g, '""')}"`;
  }

  function build(headers, rows) {
    return [headers.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\r\n');
  }

  return { neutralizeFormula, cell, build };
});
