// ===========================================================
// Shared logic for add-property.html and edit-property.html
// mode: 'add' | 'edit'
// ===========================================================

function initPropertyForm(mode) {
  requireAuth();
  renderShell('properties.html');

  const form = document.getElementById('property-form');
  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get('id');
  const imageGallery = document.getElementById('image-gallery');
  const imageInput = document.getElementById('image-input');

  if (mode === 'edit' && !propertyId) {
    toast('No property selected to edit.', 'error');
    window.location.href = 'properties.html';
    return;
  }

  document.getElementById('form-title').textContent = mode === 'edit' ? 'Edit Property' : 'Add Property';

  const FIELD_IDS = [
    'title', 'property_type', 'purpose', 'price', 'price_label', 'city', 'locality', 'sector',
    'bhk', 'bathrooms', 'area', 'area_unit', 'property_status', 'possession_status',
    'description', 'short_description', 'developer', 'rera_number', 'property_facing',
    'floor', 'total_floors', 'parking', 'furnishing', 'year_built',
    'seo_title', 'seo_description', 'canonical_url'
  ];
  const CHECKBOX_IDS = ['featured', 'verified', 'new_launch'];

  function collectPayload() {
    const payload = {};
    FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.value !== '') payload[id] = el.value;
    });
    CHECKBOX_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) payload[id] = el.checked ? 1 : 0;
    });
    const amenities = document.getElementById('amenities').value;
    if (amenities.trim()) payload.amenities = amenities.split(',').map(s => s.trim()).filter(Boolean);
    const statusEl = document.getElementById('status');
    if (statusEl) payload.status = statusEl.value;
    return payload;
  }

  function fillForm(data) {
    FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined && data[id] !== null) el.value = data[id];
    });
    CHECKBOX_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!data[id];
    });
    const statusEl = document.getElementById('status');
    if (statusEl && data.status) statusEl.value = data.status;
    if (data.amenities) {
      try {
        const arr = typeof data.amenities === 'string' ? JSON.parse(data.amenities) : data.amenities;
        document.getElementById('amenities').value = Array.isArray(arr) ? arr.join(', ') : '';
      } catch { /* ignore */ }
    }
    if (data.images) renderGallery(data.images);
  }

  function renderGallery(images) {
    if (!images.length) {
      imageGallery.innerHTML = `<div class="empty-state" style="padding:16px;">No images uploaded yet.</div>`;
      return;
    }
    const origin = window.LANDLINE_API_ORIGIN || window.location.origin;
    imageGallery.innerHTML = images.map(img => `
      <div class="gallery-item" data-id="${img.id}" style="position:relative;">
        <img src="${origin}${img.image_path}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;${img.is_featured ? 'outline:3px solid #C89B3C;' : ''}">
        <div style="display:flex;gap:4px;margin-top:4px;">
          <button type="button" class="btn btn-sm btn-outline" data-set-cover="${img.id}" style="flex:1;font-size:11px;padding:4px;">${img.is_featured ? '★ Cover' : 'Set Cover'}</button>
          <button type="button" class="btn btn-sm btn-danger" data-delete-img="${img.id}" style="font-size:11px;padding:4px 8px;">✕</button>
        </div>
      </div>
    `).join('');
  }

  imageGallery?.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('[data-delete-img]');
    const coverBtn = e.target.closest('[data-set-cover]');
    if (delBtn) {
      if (!confirm('Delete this image?')) return;
      try {
        await apiRequest(`/admin/properties/images/${delBtn.dataset.deleteImg}`, { method: 'DELETE' });
        toast('Image deleted.');
        loadImages();
      } catch (err) { toast(err.message, 'error'); }
    }
    if (coverBtn) {
      try {
        const detail = await apiRequest(`/admin/properties/${propertyId}`);
        const order = detail.data.images.map(img => ({ id: img.id, sort_order: img.sort_order, is_featured: img.id == coverBtn.dataset.setCover ? 1 : 0 }));
        await apiRequest(`/admin/properties/${propertyId}/images/reorder`, { method: 'PATCH', body: { order } });
        toast('Cover image updated.');
        loadImages();
      } catch (err) { toast(err.message, 'error'); }
    }
  });

  async function loadImages() {
    if (!propertyId) return;
    const detail = await apiRequest(`/admin/properties/${propertyId}`);
    renderGallery(detail.data.images);
  }

  imageInput?.addEventListener('change', async () => {
    if (!propertyId) {
      toast('Save the property first, then upload images.', 'error');
      imageInput.value = '';
      return;
    }
    if (!imageInput.files.length) return;
    const fd = new FormData();
    Array.from(imageInput.files).forEach(f => fd.append('images', f));
    try {
      await apiRequest(`/admin/properties/${propertyId}/images`, { method: 'POST', body: fd, isForm: true });
      toast('Images uploaded.');
      imageInput.value = '';
      loadImages();
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---- Load existing data (edit mode) ----
  if (mode === 'edit') {
    (async () => {
      try {
        const res = await apiRequest(`/admin/properties/${propertyId}`);
        fillForm(res.data);
      } catch (err) {
        toast(err.message, 'error');
      }
    })();
  } else {
    imageGallery.innerHTML = `<div class="empty-state" style="padding:16px;">Save the property first to enable image uploads.</div>`;
  }

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = collectPayload();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      if (mode === 'edit') {
        await apiRequest(`/admin/properties/${propertyId}`, { method: 'PUT', body: payload });
        toast('Property updated.');
      } else {
        const res = await apiRequest('/admin/properties', { method: 'POST', body: payload });
        toast('Property created. Now add images below.');
        window.location.href = `edit-property.html?id=${res.data.id}`;
        return;
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Property';
    }
  });
}
