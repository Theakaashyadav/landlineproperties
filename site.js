function applyLandlineContactSettings(data, root = document) {
  if (!data || !root) return;
  const phone = String(data.phone || '').replace(/[^+\d]/g, '');
  const whatsapp = String(data.whatsapp || data.phone || '').replace(/\D/g, '');
  const selectAll = (selector) => {
    const matches = root.matches?.(selector) ? [root] : [];
    return [...matches, ...(root.querySelectorAll?.(selector) || [])];
  };
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    const displayPhone = data.phone_display || (digits.length === 12 && digits.startsWith('91')
      ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
      : String(data.phone || '').trim());
    selectAll('a[href^="tel:"]').forEach((link) => {
      link.href = `tel:${phone}`;
      if (link.matches('[data-site-phone]')) link.textContent = displayPhone;
    });
    selectAll('[data-site-phone]:not(a)').forEach((element) => { element.textContent = displayPhone; });
  }
  if (whatsapp) selectAll('a[href*="wa.me/"]').forEach((link) => {
    const query = new URL(link.href, window.location.href).search;
    link.href = `https://wa.me/${whatsapp}${query}`;
  });
  if (data.email) selectAll('a[href^="mailto:"]').forEach((link) => {
    link.href = `mailto:${data.email}`;
    if (link.matches('[data-site-email]') || link.textContent.includes('@')) link.textContent = data.email;
  });
}
window.applyLandlineContactSettings = applyLandlineContactSettings;

document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('main');
  if (main) {
    if (!main.id) main.id = 'main-content';
    if (!document.querySelector('.skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.className = 'skip-link';
      skipLink.href = `#${main.id}`;
      skipLink.textContent = 'Skip to main content';
      document.body.prepend(skipLink);
    }
  }

  // Repair common authored accessibility relationships in one shared place.
  document.querySelectorAll('label:not([for])').forEach((label, index) => {
    if (label.querySelector('input, select, textarea')) return;
    const control = label.nextElementSibling;
    if (!control?.matches('input, select, textarea')) return;
    if (!control.id) control.id = `field-${index + 1}`;
    label.htmlFor = control.id;
  });
  document.querySelectorAll('dialog').forEach((dialog, index) => {
    if (dialog.hasAttribute('aria-label') || dialog.hasAttribute('aria-labelledby')) return;
    const heading = dialog.querySelector('h1, h2, h3');
    if (!heading) return;
    if (!heading.id) heading.id = `dialog-title-${index + 1}`;
    dialog.setAttribute('aria-labelledby', heading.id);
  });

  if (!document.querySelector('link[rel="canonical"]')) {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = `https://landlineproperties.com/${window.location.pathname.split('/').pop()}`;
    document.head.appendChild(canonical);
  }
  // Uses the contact number already displayed across the website.
  const WHATSAPP_NUMBER = '919876543210';
  const whatsappMessage = encodeURIComponent('Hi! I would like help with a property enquiry.');
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

  const whatsappStyles = document.createElement('style');
  whatsappStyles.textContent = `
    .wa-widget { position: fixed; right: 24px; bottom: 24px; z-index: 1100; font-family: Arial, Helvetica, sans-serif; }
    .wa-widget__toggle { position: relative; width: 62px; height: 62px; display: grid; place-items: center; margin-left: auto; border: 0; border-radius: 50%; background: #25d366; color: #fff; cursor: pointer; box-shadow: 0 12px 28px rgba(10, 111, 52, .32), inset 0 1px rgba(255,255,255,.25); transition: transform .24s ease, box-shadow .24s ease, background-color .24s ease; }
    .wa-widget__toggle:hover, .wa-widget__toggle:focus-visible { background: #1fba57; transform: translateY(-4px) scale(1.04); box-shadow: 0 18px 34px rgba(10, 111, 52, .42), inset 0 1px rgba(255,255,255,.25); outline: 0; }
    .wa-widget__toggle svg { width: 31px; height: 31px; fill: currentColor; }
    .wa-widget__badge { position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border: 3px solid #fff; border-radius: 50%; background: #c89b3c; box-shadow: 0 3px 8px rgba(0,0,0,.18); }
    .wa-widget__panel { position: absolute; right: 0; bottom: 78px; width: min(342px, calc(100vw - 32px)); overflow: hidden; border: 1px solid rgba(23, 42, 31, .08); border-radius: 18px; background: #fff; color: #18202a; box-shadow: 0 20px 55px rgba(0, 0, 0, .24); opacity: 0; visibility: hidden; transform: translateY(18px) scale(.96); transform-origin: bottom right; pointer-events: none; transition: opacity .26s ease, visibility .26s ease, transform .26s cubic-bezier(.2,.8,.25,1); }
    .wa-widget.is-open .wa-widget__panel { opacity: 1; visibility: visible; transform: translateY(0) scale(1); pointer-events: auto; }
    .wa-widget__header { display: flex; align-items: center; gap: 11px; min-height: 76px; padding: 15px 50px 15px 17px; background: linear-gradient(135deg, #147b3d, #25d366); color: #fff; }
    .wa-widget__brand-icon { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; border: 2px solid rgba(255,255,255,.78); border-radius: 50%; background: #25d366; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    .wa-widget__brand-icon svg { width: 25px; height: 25px; fill: #fff; }
    .wa-widget__header h2 { margin: 0; font-size: 16px; line-height: 1.2; }
    .wa-widget__status { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 11px; color: rgba(255,255,255,.9); }
    .wa-widget__status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #d7ffe6; box-shadow: 0 0 0 3px rgba(255,255,255,.13); }
    .wa-widget__close { position: absolute; top: 13px; right: 13px; width: 30px; height: 30px; border: 0; border-radius: 50%; background: rgba(255,255,255,.17); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; transition: background-color .2s ease, transform .2s ease; }
    .wa-widget__close:hover, .wa-widget__close:focus-visible { background: rgba(0,0,0,.16); transform: rotate(90deg); outline: 0; }
    .wa-widget__body { padding: 19px; background: linear-gradient(180deg, #fbfcfb, #fff); }
    .wa-widget__message { margin: 0 0 8px; padding: 13px 14px; border-radius: 4px 12px 12px; background: #edf8ef; color: #1e3024; font-size: 14px; font-weight: 700; line-height: 1.45; }
    .wa-widget__detail { margin: 0 0 17px; color: #66707a; font-size: 13px; line-height: 1.55; }
    .wa-widget__chat { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 10px; background: #18202a; color: #fff; font-size: 14px; font-weight: 700; transition: background-color .2s ease, transform .2s ease, box-shadow .2s ease; }
    .wa-widget__chat:hover, .wa-widget__chat:focus-visible { background: #1f9b4c; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(31,155,76,.22); outline: 0; }
    .wa-widget__chat svg { width: 18px; height: 18px; fill: currentColor; }
    @media (max-width: 600px) { .wa-widget { right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); } .wa-widget__panel { bottom: 70px; width: min(342px, calc(100vw - 32px)); } .wa-widget__toggle { width: 56px; height: 56px; } .wa-widget__toggle svg { width: 28px; height: 28px; } }
    @media (prefers-reduced-motion: reduce) { .wa-widget, .wa-widget * { transition: none !important; } }
  `;
  document.head.appendChild(whatsappStyles);

  document.body.insertAdjacentHTML('beforeend', `
    <aside class="wa-widget" aria-label="WhatsApp chat">
      <div class="wa-widget__panel" role="dialog" aria-label="Chat with Landline Properties" aria-hidden="true">
        <div class="wa-widget__header">
          <span class="wa-widget__brand-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20.52 3.48A11.78 11.78 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.92L.1 24l6.36-1.67a11.86 11.86 0 0 0 5.62 1.43h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.15-3.45-8.4Zm-8.44 18.27h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.78.99 1.01-3.68-.24-.38a9.85 9.85 0 0 1-1.51-5.23c0-5.44 4.43-9.87 9.88-9.87a9.8 9.8 0 0 1 6.98 2.9 9.8 9.8 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.87 9.88Zm5.41-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.39-1.48a8.95 8.95 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.23 1.35.2 1.86.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg></span>
          <div><h2>Chat with us</h2><span class="wa-widget__status">Typically replies instantly</span></div>
        </div>
        <button class="wa-widget__close" type="button" aria-label="Close WhatsApp chat">×</button>
        <div class="wa-widget__body">
          <p class="wa-widget__message">Hi &#128075; How can we help you today?</p>
          <p class="wa-widget__detail">Message us for property guidance, current availability or a site visit.</p>
        <a class="wa-widget__chat" href="${whatsappUrl}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.78 11.78 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.92L.1 24l6.36-1.67a11.86 11.86 0 0 0 5.62 1.43h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.15-3.45-8.4Zm-8.44 18.27h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.78.99 1.01-3.68-.24-.38a9.85 9.85 0 0 1-1.51-5.23c0-5.44 4.43-9.87 9.88-9.87a9.8 9.8 0 0 1 6.98 2.9 9.8 9.8 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.87 9.88Zm5.41-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.39-1.48a8.95 8.95 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.23 1.35.2 1.86.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg>
          Chat on WhatsApp
        </a>
        </div>
      </div>
      <button class="wa-widget__toggle" type="button" aria-label="Open WhatsApp chat" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.78 11.78 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.92L.1 24l6.36-1.67a11.86 11.86 0 0 0 5.62 1.43h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.15-3.45-8.4Zm-8.44 18.27h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.78.99 1.01-3.68-.24-.38a9.85 9.85 0 0 1-1.51-5.23c0-5.44 4.43-9.87 9.88-9.87a9.8 9.8 0 0 1 6.98 2.9 9.8 9.8 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.87 9.88Z"/></svg>
        <span class="wa-widget__badge" aria-hidden="true"></span>
      </button>
    </aside>
  `);

  const whatsappWidget = document.querySelector('.wa-widget');
  const whatsappPanel = whatsappWidget.querySelector('.wa-widget__panel');
  const whatsappToggle = whatsappWidget.querySelector('.wa-widget__toggle');
  const whatsappClose = whatsappWidget.querySelector('.wa-widget__close');
  const officialWhatsappIcon = whatsappWidget.querySelector('.wa-widget__brand-icon svg');
  const whatsappBadge = whatsappWidget.querySelector('.wa-widget__badge');
  whatsappClose.innerHTML = '&times;';
  whatsappToggle.replaceChildren(officialWhatsappIcon.cloneNode(true), whatsappBadge);
  const setWhatsappOpen = (open) => {
    whatsappWidget.classList.toggle('is-open', open);
    whatsappPanel.setAttribute('aria-hidden', String(!open));
    whatsappToggle.setAttribute('aria-expanded', String(open));
    whatsappToggle.setAttribute('aria-label', open ? 'Close WhatsApp chat' : 'Open WhatsApp chat');
  };
  const whatsappAutoPopupKey = 'landline-whatsapp-auto-popup-shown';
  let whatsappAutoPopupTimer;
  let whatsappPopupShown = false;
  try {
    whatsappPopupShown = sessionStorage.getItem(whatsappAutoPopupKey) === 'true';
  } catch (error) {
    // The chat still works when browser storage is unavailable.
  }
  const cancelWhatsappAutoPopup = () => {
    clearTimeout(whatsappAutoPopupTimer);
    try {
      sessionStorage.setItem(whatsappAutoPopupKey, 'true');
    } catch (error) {
      // Ignore storage restrictions.
    }
  };
  if (!whatsappPopupShown) {
    whatsappAutoPopupTimer = setTimeout(() => {
      setWhatsappOpen(true);
      cancelWhatsappAutoPopup();
    }, 7000);
  }
  whatsappToggle.addEventListener('click', () => {
    cancelWhatsappAutoPopup();
    setWhatsappOpen(!whatsappWidget.classList.contains('is-open'));
  });
  whatsappClose.addEventListener('click', () => {
    cancelWhatsappAutoPopup();
    setWhatsappOpen(false);
    whatsappToggle.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      cancelWhatsappAutoPopup();
      const wasOpen = whatsappWidget.classList.contains('is-open');
      setWhatsappOpen(false);
      if (wasOpen) whatsappToggle.focus();
    }
  });

  const nav = document.querySelector('.navbar');
  const links = document.querySelector('.nav-links');
  if (!nav || !links) return;
  links.setAttribute('role', 'navigation');
  links.setAttribute('aria-label', 'Primary navigation');

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const activePage = {
    'property-details.html': 'featured-properties.html',
    'project-details.html': 'new-projects.html',
    'gurgaon-properties.html': 'locations.html',
    'noida-properties.html': 'locations.html',
    'greater-noida-properties.html': 'locations.html',
    'delhi-properties.html': 'locations.html'
  }[currentPage] || currentPage;
  // Preserve each page's authored navigation; only correct its active state.
  links.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href')?.split(/[?#]/)[0];
    const active = href === activePage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const toggle = document.createElement('button');
  toggle.className = 'mobile-nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open navigation menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  nav.insertBefore(toggle, nav.querySelector('.nav-buttons'));

  const mobileActions = document.createElement('li');
  mobileActions.className = 'mobile-nav-actions';
  mobileActions.innerHTML = '<a href="contact.html">Get Expert Assistance</a><a href="list-property.html">List Your Property</a>';
  links.appendChild(mobileActions);

  const setMenuOpen = (open) => {
    links.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  };

  toggle.addEventListener('click', () => {
    setMenuOpen(!links.classList.contains('is-open'));
  });
  links.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (links.classList.contains('is-open') && !event.target.closest('.navbar')) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && links.classList.contains('is-open')) {
      setMenuOpen(false);
      toggle.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) setMenuOpen(false);
  }, { passive: true });

  const params = new URLSearchParams(window.location.search);
  const location = params.get('location');
  if (location && (window.location.pathname.endsWith('rent.html') || window.location.pathname.endsWith('featured-properties.html'))) {
    const heading = document.querySelector('.page-hero h1');
    const description = document.querySelector('.page-hero p');
    const type = params.get('type') || 'property';
    const budget = params.get('budget') || 'your selected budget';
    if (heading) heading.textContent = `${type} options in ${location}`;
    if (description) description.textContent = `Browse available options for ${location}. Select a card to request current details, availability and pricing for ${budget}.`;
  }

  const existingFooter = document.querySelector('footer');
  if (existingFooter) {
    existingFooter.outerHTML = `<footer class="professional-footer"><div class="container"><div class="footer-top"><div><a class="footer-logo-box" href="index.html" aria-label="Landline Properties home"><img src="image/Landline.png" alt="Landline Properties" width="96" height="68" loading="lazy"></a><p>Landline Properties is your trusted real estate connection for property buying, renting, new projects and local broker assistance across Delhi NCR.</p></div><div><h2>Quick Links</h2><nav class="footer-links" aria-label="Quick links"><a href="index.html">Home</a><a href="featured-properties.html">Buy Property</a><a href="rent.html">Rent Property</a><a href="new-projects.html">New Projects</a><a href="gallery-profile.html">Gallery</a><a href="about.html">About Us</a></nav></div><div><h2>Property Links</h2><nav class="footer-links" aria-label="Property links"><a href="featured-properties.html">Properties for Sale</a><a href="rent.html">Properties for Rent</a><a href="new-projects.html">New Launch Projects</a><a href="locations.html">Browse by Location</a><a href="list-property.html">List Your Property</a></nav></div><div><h2>Contact Landline</h2><div class="footer-contact"><a href="locations.html">Gurgaon · Noida · Greater Noida · Delhi NCR</a><a href="tel:+919876543210" data-site-phone>+91 98765 43210</a><a href="mailto:hello@landline.com">hello@landline.com</a></div><div class="footer-actions"><a class="whatsapp" href="https://wa.me/919876543210" target="_blank" rel="noopener">WhatsApp</a><a href="tel:+919876543210">Call Now</a></div></div></div><div class="footer-bottom"><span>© 2026 Landline Properties. All Rights Reserved.</span><nav class="footer-legal" aria-label="Legal links"><a href="locations.html">Popular Locations</a><a href="privacy-policy.html">Privacy Policy</a><a href="terms-and-conditions.html">Terms &amp; Conditions</a><a href="contact.html">Contact</a></nav></div></div></footer>`;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('footer a[href="gallery-profile.html"]').forEach((link) => {
    if (link.textContent.trim() === 'gallery profile') link.textContent = 'Gallery';
  });
  document.querySelectorAll('footer a[href="gallery.html"]').forEach((link) => {
    link.href = 'gallery-profile.html';
  });
  const footerQuickLinks = document.querySelector('footer .footer-links');
  if (footerQuickLinks && !footerQuickLinks.querySelector('a[href="investment.html"]')) {
    const investmentLink = document.createElement('a');
    investmentLink.href = 'investment.html';
    investmentLink.textContent = 'Investment';
    footerQuickLinks.appendChild(investmentLink);
  }
});

/* Consistent, accessible property-search dropdowns across public pages. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.search-grid select[name="location"]').forEach((select) => {
    if (![...select.options].some((option) => option.value === 'Uttarakhand')) {
      select.add(new Option('Uttarakhand', 'Uttarakhand'));
    }
  });
  const searchSelects = document.querySelectorAll('.search-grid select');
  if (!searchSelects.length) return;

  let openSelect = null;
  const closeSelect = (wrapper, returnFocus = false) => {
    if (!wrapper) return;
    wrapper.classList.remove('is-open');
    const trigger = wrapper.querySelector('.smart-select__trigger');
    trigger?.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger?.focus();
    if (openSelect === wrapper) openSelect = null;
  };

  searchSelects.forEach((select, selectIndex) => {
    if (select.dataset.smartSelect === 'ready') return;
    select.dataset.smartSelect = 'ready';
    select.classList.add('smart-select__native');

    const wrapper = document.createElement('div');
    wrapper.className = 'smart-select';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'smart-select__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `smart-select-options-${selectIndex}`);

    const list = document.createElement('div');
    list.className = 'smart-select__options';
    list.id = `smart-select-options-${selectIndex}`;
    list.setAttribute('role', 'listbox');

    const sync = () => {
      const selected = select.options[select.selectedIndex] || select.options[0];
      trigger.textContent = selected?.textContent || 'Select';
      list.querySelectorAll('[role="option"]').forEach((option) => {
        const active = Number(option.dataset.index) === select.selectedIndex;
        option.classList.toggle('is-selected', active);
        option.setAttribute('aria-selected', String(active));
      });
    };

    Array.from(select.options).forEach((nativeOption, optionIndex) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'smart-select__option';
      option.dataset.index = String(optionIndex);
      option.setAttribute('role', 'option');
      option.textContent = nativeOption.textContent;
      option.disabled = nativeOption.disabled;
      option.addEventListener('click', () => {
        select.selectedIndex = optionIndex;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
        closeSelect(wrapper, true);
      });
      list.appendChild(option);
    });

    trigger.addEventListener('click', () => {
      const shouldOpen = !wrapper.classList.contains('is-open');
      if (openSelect && openSelect !== wrapper) closeSelect(openSelect);
      wrapper.classList.toggle('is-open', shouldOpen);
      trigger.setAttribute('aria-expanded', String(shouldOpen));
      openSelect = shouldOpen ? wrapper : null;
      if (shouldOpen) list.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
    });
    trigger.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const options = [...list.querySelectorAll('.smart-select__option:not(:disabled)')];
      const current = options.findIndex((option) => option.classList.contains('is-selected'));
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : event.key === 'ArrowDown' ? Math.min(current + 1, options.length - 1)
          : Math.max(current - 1, 0);
      options[next]?.click();
    });
    wrapper.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSelect(wrapper, true);
    });
    select.addEventListener('change', sync);
    select.form?.addEventListener('reset', () => setTimeout(sync));

    wrapper.append(trigger, list);
    select.insertAdjacentElement('afterend', wrapper);
    sync();
    setTimeout(sync);
  });

  document.addEventListener('pointerdown', (event) => {
    if (openSelect && !event.target.closest('.smart-select')) closeSelect(openSelect);
  });
  window.addEventListener('resize', () => closeSelect(openSelect), { passive: true });
});

/* Public business contact details come from the single settings row. */
document.addEventListener('DOMContentLoaded', async () => {
  const localPreview = location.protocol === 'file:' || (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '5000');
  const origin = String(window.LANDLINE_API_ORIGIN || (localPreview ? 'http://localhost:5000' : location.origin)).replace(/\/$/, '');
  try {
    const response = await fetch(`${origin}/api/settings/public`);
    if (!response.ok) return;
    const { data = {} } = await response.json();
    window.LANDLINE_SITE_SETTINGS = data;
    applyLandlineContactSettings(data);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) applyLandlineContactSettings(data, node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch {
    // Static fallback details remain usable when the API is unavailable.
  }
});
