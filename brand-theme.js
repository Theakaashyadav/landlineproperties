(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('brand-site')) return;

    const header = document.querySelector('body > header');
    if (header) {
      let frameRequested = false;
      const updateHeader = () => {
        header.classList.toggle('brand-scrolled', window.scrollY > 18);
        frameRequested = false;
      };
      window.addEventListener('scroll', () => {
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(updateHeader);
      }, { passive: true });
      updateHeader();
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const targets = document.querySelectorAll('main .brand-photo-panel, main .brand-region-tile, main .brand-hero-visual, main .hp-section-heading, main .region-shortlist, main .about-heading');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('brand-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    targets.forEach((target) => {
      target.classList.add('brand-reveal');
      observer.observe(target);
    });
  });
})();
