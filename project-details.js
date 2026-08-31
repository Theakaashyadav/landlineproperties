(function () {
  'use strict';
  const localPreview = location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '5000');
  const origin = String(window.LANDLINE_API_ORIGIN || (localPreview ? 'http://localhost:5000' : location.origin)).replace(/\/$/, '');
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const fallback = 'image/home-hero-luxury-delhi-ncr.png';
  const image = (path) => !path ? fallback : /^https?:/i.test(path) ? path : `${origin}${path}`;
  const parse = (value) => { if (Array.isArray(value)) return value; try { const result = JSON.parse(value || '[]'); return Array.isArray(result) ? result : []; } catch { return []; } };
  const price = (value) => { const amount = Number(value); if (!Number.isFinite(amount) || amount <= 0) return 'Price on request'; return amount >= 1e7 ? `₹${(amount / 1e7).toFixed(2)} Cr` : `₹${(amount / 1e5).toFixed(2)} Lakh`; };

  document.addEventListener('DOMContentLoaded', async () => {
    const main = document.getElementById('project-detail');
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) { main.innerHTML = '<section class="section"><div class="container empty"><h1>Project not found</h1><p>Please open a project from the current listings.</p><a class="btn btn-dark" href="new-projects.html">Browse Projects</a></div></section>'; return; }
    try {
      const response = await fetch(`${origin}/api/projects/${encodeURIComponent(slug)}`);
      const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.message || 'Project not found.');
      const project = result.data; const amenities = parse(project.amenities); const firstImage = project.images?.[0]?.image_path || project.featured_image;
      document.title = `${project.seo_title || project.name} | Landline Properties`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', project.seo_description || project.description || `Explore ${project.name} in ${project.city}.`);
      let canonical = document.querySelector('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); } canonical.href = `https://landlineproperties.com/project-details.html?slug=${encodeURIComponent(project.slug)}`;
      main.innerHTML = `<div class="container breadcrumb"><a href="index.html">Home</a> / <a href="new-projects.html">New Projects</a> / ${esc(project.name)}</div><section class="section"><div class="container project-detail-grid"><article><img src="${esc(image(firstImage))}" alt="${esc(project.images?.[0]?.alt_text || `${project.name} in ${project.city}`)}" onerror="this.onerror=null;this.src='${fallback}'"><span class="eyebrow" style="margin-top:24px">${esc(project.project_status)}</span><h1>${esc(project.name)}</h1><p class="location">${esc(project.city)}</p><p>${esc(project.description || 'Contact us for current project details.')}</p><div class="specs"><span>${esc(project.configuration || 'Configuration on request')}</span>${project.developer ? `<span>${esc(project.developer)}</span>` : ''}</div>${amenities.length ? `<h2>Project Amenities</h2><div class="amenities">${amenities.map((item) => `<span>${esc(item)}</span>`).join('')}</div>` : ''}<p>Confirm approvals, specifications, availability and commercial terms independently.</p></article><aside class="project-side"><span class="eyebrow">Project overview</span><p class="price">${price(project.starting_price)}</p><p>${esc(project.project_status)}</p><button class="btn btn-dark" data-project-enquire="${project.id}">Request Details</button><a class="btn" href="tel:+919876543210">Call</a></aside></div></section>`;
    } catch (error) { main.innerHTML = `<section class="section"><div class="container empty"><h1>Project not found</h1><p>${esc(error.message)}</p><a class="btn btn-dark" href="new-projects.html">Browse Projects</a></div></section>`; }
  });
})();
