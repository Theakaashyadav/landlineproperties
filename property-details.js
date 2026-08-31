(function () {
  'use strict';
  const localPreview = location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '5000');
  const origin = String(window.LANDLINE_API_ORIGIN || (localPreview ? 'http://localhost:5000' : location.origin)).replace(/\/$/, '');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const fallback = 'image/home-hero-luxury-evening-v2.png';
  const imageUrl = (path) => !path ? fallback : /^https?:/i.test(path) ? path : `${origin}${path}`;
  const money = (property) => {
    if (property.price_label) return escapeHtml(property.price_label);
    const value = Number(property.price);
    if (!Number.isFinite(value)) return 'Price on request';
    const result = value >= 1e7 ? `₹${(value / 1e7).toFixed(2)} Cr` : value >= 1e5 ? `₹${(value / 1e5).toFixed(2)} Lakh` : `₹${value.toLocaleString('en-IN')}`;
    return property.purpose === 'Rent' ? `${result}/month` : result;
  };

  async function load() {
    const main = document.getElementById('detail-main');
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) {
      main.innerHTML = '<section class="section"><div class="container empty"><h1>Property not found</h1><p>Please open a property from the current listings.</p><a class="btn btn-dark" href="featured-properties.html">Browse Properties</a></div></section>';
      return;
    }
    try {
      const response = await fetch(`${origin}/api/properties/${encodeURIComponent(slug)}`);
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Property not found.');
      const property = result.data;
      const images = property.images?.length ? property.images : [{ image_path: null, alt_text: property.title }];
      const back = property.purpose === 'Rent' ? 'rent.html' : 'featured-properties.html';
      const place = [property.locality, property.city].filter(Boolean).join(', ');
      document.title = `${property.seo_title || property.title} | Landline Properties`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', property.seo_description || property.short_description || `Explore ${property.title} in ${property.city}.`);
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = `https://landlineproperties.com/property-details.html?slug=${encodeURIComponent(property.slug)}`;
      main.innerHTML = `<div class="container breadcrumb"><a href="index.html">Home</a> / <a href="${back}">${property.purpose === 'Rent' ? 'Rent' : 'Buy'}</a> / ${escapeHtml(property.title)}</div><section class="section"><div class="container detail-layout"><article><img class="detail-image" src="${escapeHtml(imageUrl(images[0].image_path))}" alt="${escapeHtml(images[0].alt_text || `${property.title} in ${property.city}`)}" onerror="this.onerror=null;this.src='${fallback}'"><span class="eyebrow" style="margin-top:25px">${escapeHtml(property.property_type)} · ${escapeHtml(property.property_status || property.purpose)}</span><h1>${escapeHtml(property.title)}</h1><p class="location">${escapeHtml(place)}</p><p>${escapeHtml(property.description || property.short_description || 'Contact us for complete property details.')}</p><div class="specs">${property.bhk ? `<span>${escapeHtml(property.bhk)}</span>` : ''}${property.area ? `<span>${Number(property.area).toLocaleString('en-IN')} ${escapeHtml(property.area_unit || 'Sq.Ft.')}</span>` : ''}<span>${escapeHtml(property.property_type)}</span>${property.furnishing ? `<span>${escapeHtml(property.furnishing)}</span>` : ''}</div></article><aside class="detail-panel"><span class="eyebrow">Property overview</span><p class="price">${money(property)}</p><p>Availability and commercial terms should be reconfirmed before making a decision.</p><button class="btn btn-dark" data-enquire="${property.id}" data-property-slug="${escapeHtml(property.slug)}">Enquire Now</button><a class="btn" href="tel:+919876543210">Call</a></aside></div></section>`;
    } catch (error) {
      main.innerHTML = `<section class="section"><div class="container empty"><h1>Property not found</h1><p>${escapeHtml(error.message)}</p><a class="btn btn-dark" href="featured-properties.html">Browse Properties</a></div></section>`;
    }
  }
  document.addEventListener('DOMContentLoaded', load);
})();
