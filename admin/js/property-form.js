// Shared logic for add-property.html and edit-property.html.
function initPropertyForm(mode) {
  requireAuth();
  renderShell('properties.html');

  const form = document.getElementById('property-form');
  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get('id');
  const imageGallery = document.getElementById('image-gallery');
  const imageInput = document.getElementById('image-input');
  const submitButton = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');
  const requiredFields = new Set(['title', 'property_type', 'purpose', 'price', 'city']);
  const numericFields = new Set(['price', 'bathrooms', 'area', 'year_built']);
  const fieldIds = [
    'title', 'property_type', 'purpose', 'price', 'price_label', 'city', 'locality', 'sector',
    'bhk', 'bathrooms', 'area', 'area_unit', 'property_status', 'possession_status',
    'description', 'short_description', 'developer', 'rera_number', 'property_facing',
    'floor', 'total_floors', 'parking', 'furnishing', 'year_built',
    'seo_title', 'seo_description', 'canonical_url'
  ];
  const checkboxIds = ['featured', 'verified', 'new_launch'];

  if (mode === 'edit' && (!propertyId || !/^\d+$/.test(propertyId))) {
    toast('No valid property was selected to edit.', 'error');
    window.location.replace('properties.html');
    return;
  }

  document.getElementById('form-title').textContent = mode === 'edit' ? 'Edit Property' : 'Add Property';
  const yearInput = document.getElementById('year_built');
  if (yearInput) yearInput.max = String(new Date().getFullYear() + 10);

  form.querySelectorAll('.form-field').forEach((field) => {
    if (field.querySelector('.checkbox-row')) return;
    const label = field.querySelector('label');
    const control = field.querySelector('input, select, textarea');
    if (label && control?.id) label.htmlFor = control.id;
  });
  form.querySelectorAll('.checkbox-row').forEach((row) => {
    const input = row.querySelector('input');
    const label = row.querySelector('label');
    if (input?.id && label) label.htmlFor = input.id;
  });

  const constraints = {
    title: { minlength: 3, maxlength: 255 },
    price: { min: 0, max: 9999999999999.99, step: 0.01 },
    price_label: { maxlength: 100 },
    locality: { maxlength: 150 },
    sector: { maxlength: 100 },
    bhk: { maxlength: 10 },
    bathrooms: { min: 0, max: 100, step: 1 },
    area: { min: 0, max: 99999999.99, step: 0.01 },
    possession_status: { maxlength: 100 },
    property_facing: { maxlength: 50 },
    floor: { maxlength: 20 },
    total_floors: { maxlength: 20 },
    parking: { maxlength: 50 },
    developer: { maxlength: 150 },
    rera_number: { maxlength: 100 },
    amenities: { maxlength: 5000 },
    short_description: { maxlength: 500 },
    description: { maxlength: 50000 },
    seo_title: { maxlength: 255 },
    seo_description: { maxlength: 500 },
    canonical_url: { maxlength: 255, type: 'url' }
  };
  Object.entries(constraints).forEach(([id, attributes]) => {
    const element = document.getElementById(id);
    Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, String(value)));
  });

  function showFormError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = false;
    formError.focus();
  }

  function clearFormError() {
    if (!formError) return;
    formError.hidden = true;
    formError.textContent = '';
  }

  function parseAmenities() {
    const value = document.getElementById('amenities').value;
    return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
  }

  function collectPayload() {
    const payload = {};
    fieldIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      const value = element.value.trim();
      if (value === '') {
        // PUT is treated as a complete edit for exposed fields. Sending null is
        // intentional: omitting the key would preserve a value the editor cleared.
        if (mode === 'edit' && !requiredFields.has(id)) payload[id] = null;
        return;
      }
      payload[id] = numericFields.has(id) ? Number(value) : value;
    });
    checkboxIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) payload[id] = element.checked ? 1 : 0;
    });
    const amenities = parseAmenities();
    if (mode === 'edit' || amenities.length) payload.amenities = amenities;
    const statusElement = document.getElementById('status');
    if (statusElement) payload.status = statusElement.value;
    return payload;
  }

  function validateForm() {
    clearFormError();
    if (!form.checkValidity()) {
      form.reportValidity();
      showFormError('Please correct the highlighted fields before saving.');
      return false;
    }
    const amenities = parseAmenities();
    if (amenities.length > 50 || amenities.some((item) => item.length > 100)) {
      showFormError('Enter no more than 50 amenities, with each amenity limited to 100 characters.');
      document.getElementById('amenities').focus();
      return false;
    }
    const year = document.getElementById('year_built').value;
    if (year && (Number(year) < 1900 || Number(year) > new Date().getFullYear() + 10)) {
      showFormError('Year built must be between 1900 and ten years from now.');
      yearInput.focus();
      return false;
    }
    return true;
  }

  function fillForm(data) {
    fieldIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.value = data[id] ?? '';
    });
    checkboxIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.checked = Boolean(data[id]);
    });
    const statusElement = document.getElementById('status');
    if (statusElement && data.status) statusElement.value = data.status;

    let amenities = data.amenities;
    if (typeof amenities === 'string') {
      try {
        amenities = JSON.parse(amenities);
      } catch {
        amenities = [];
      }
    }
    document.getElementById('amenities').value = Array.isArray(amenities) ? amenities.join(', ') : '';
    renderSubmissionContact(data);
    renderGallery(Array.isArray(data.images) ? data.images : []);
  }

  function renderSubmissionContact(data) {
    const panel = document.getElementById('submission-contact-panel');
    if (!panel) return;
    const name = String(data.submitted_by_name || '').trim();
    const phone = String(data.submitted_by_phone || '').trim();
    const email = String(data.submitted_by_email || '').trim();
    panel.hidden = !(name || phone || email);
    if (panel.hidden) return;

    document.getElementById('submitter-name').textContent = name || 'Not supplied';
    const phoneLink = document.getElementById('submitter-phone');
    phoneLink.textContent = phone || 'Not supplied';
    const callablePhone = phone.replace(/[^\d+]/g, '');
    if (callablePhone) phoneLink.href = `tel:${callablePhone}`;
    else phoneLink.removeAttribute('href');

    const emailLink = document.getElementById('submitter-email');
    emailLink.textContent = email || 'Not supplied';
    if (email) emailLink.href = `mailto:${encodeURIComponent(email)}`;
    else emailLink.removeAttribute('href');
  }

  function renderGallery(images) {
    if (!images.length) {
      imageGallery.innerHTML = '<div class="empty-state" style="padding:16px;">No images uploaded yet.</div>';
      return;
    }
    const origin = window.LANDLINE_API_ORIGIN || window.location.origin;
    imageGallery.innerHTML = images.map((image, index) => {
      const id = Number(image.id);
      const alt = image.alt_text || `Property image ${index + 1}`;
      return `
        <div class="gallery-item" data-id="${id}" style="position:relative;">
          <img src="${escapeHtml(`${origin}${image.image_path}`)}" alt="${escapeHtml(alt)}" loading="lazy" style="width:100%;height:90px;object-fit:cover;border-radius:8px;${image.is_featured ? 'outline:3px solid #C89B3C;' : ''}">
          <div style="display:flex;gap:4px;margin-top:4px;">
            <button type="button" class="btn btn-sm btn-outline" data-set-cover="${id}" aria-label="Set image ${index + 1} as cover" style="flex:1;font-size:11px;padding:4px;">${image.is_featured ? '★ Cover' : 'Set Cover'}</button>
            <button type="button" class="btn btn-sm btn-danger" data-delete-img="${id}" aria-label="Delete image ${index + 1}" style="font-size:11px;padding:4px 8px;">×</button>
          </div>
        </div>`;
    }).join('');
  }

  async function loadImages() {
    if (!propertyId) return;
    try {
      const detail = await apiRequest(`/admin/properties/${propertyId}`);
      renderGallery(Array.isArray(detail.data.images) ? detail.data.images : []);
    } catch (error) {
      toast(error.message || 'Could not refresh property images.', 'error');
    }
  }

  imageGallery?.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-delete-img]');
    const coverButton = event.target.closest('[data-set-cover]');
    if (deleteButton) {
      if (!confirm('Delete this image?')) return;
      deleteButton.disabled = true;
      try {
        await apiRequest(`/admin/properties/images/${deleteButton.dataset.deleteImg}`, { method: 'DELETE' });
        toast('Image deleted.');
        await loadImages();
      } catch (error) {
        toast(error.message, 'error');
        deleteButton.disabled = false;
      }
    }
    if (coverButton) {
      coverButton.disabled = true;
      try {
        const detail = await apiRequest(`/admin/properties/${propertyId}`);
        const images = Array.isArray(detail.data.images) ? detail.data.images : [];
        const coverId = Number(coverButton.dataset.setCover);
        const order = images.map((image) => ({
          id: image.id,
          sort_order: image.sort_order,
          is_featured: Number(image.id) === coverId ? 1 : 0
        }));
        await apiRequest(`/admin/properties/${propertyId}/images/reorder`, { method: 'PATCH', body: { order } });
        toast('Cover image updated.');
        await loadImages();
      } catch (error) {
        toast(error.message, 'error');
        coverButton.disabled = false;
      }
    }
  });

  imageInput?.addEventListener('change', async () => {
    clearFormError();
    if (!propertyId) {
      showFormError('Save the property first, then upload images.');
      imageInput.value = '';
      return;
    }
    const files = Array.from(imageInput.files || []);
    if (!files.length) return;
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (files.length > 20) {
      showFormError('Upload no more than 20 images at a time.');
      imageInput.value = '';
      return;
    }
    if (files.some((file) => !allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024)) {
      showFormError('Every image must be a JPEG, PNG or WEBP file no larger than 5 MB.');
      imageInput.value = '';
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    imageInput.disabled = true;
    try {
      await apiRequest(`/admin/properties/${propertyId}/images`, { method: 'POST', body: formData, isForm: true });
      toast('Images uploaded.');
      imageInput.value = '';
      await loadImages();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      imageInput.disabled = false;
    }
  });

  if (mode === 'edit') {
    (async () => {
      submitButton.disabled = true;
      try {
        const response = await apiRequest(`/admin/properties/${propertyId}`);
        fillForm(response.data);
        submitButton.disabled = false;
      } catch (error) {
        showFormError(error.message || 'Could not load this property.');
        toast(error.message, 'error');
      }
    })();
  } else {
    imageGallery.innerHTML = '<div class="empty-state" style="padding:16px;">Save the property first to enable image uploads.</div>';
  }

  form.addEventListener('input', clearFormError);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const payload = collectPayload();
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    form.setAttribute('aria-busy', 'true');

    try {
      if (mode === 'edit') {
        await apiRequest(`/admin/properties/${propertyId}`, { method: 'PUT', body: payload });
        toast('Property updated.');
      } else {
        const response = await apiRequest('/admin/properties', { method: 'POST', body: payload });
        toast('Property created. You can now add images.');
        window.location.replace(`edit-property.html?id=${response.data.id}`);
        return;
      }
    } catch (error) {
      showFormError(error.message || 'The property could not be saved.');
      toast(error.message, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Save Property';
      form.removeAttribute('aria-busy');
    }
  });
}
