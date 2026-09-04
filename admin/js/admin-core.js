'use strict';

const FILE_ORIGIN_MESSAGE = 'Start the backend and open http://localhost:5000/admin/login.html. Admin pages cannot run from file://.';
const IS_FILE_ORIGIN = location.protocol === 'file:';

if (IS_FILE_ORIGIN) {
  window.__LANDLINE_FILE_ORIGIN__ = true;
  document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `<div style="font-family:Arial;max-width:720px;margin:60px auto;padding:32px;border-radius:16px;background:#111827;color:#fff"><h2>Admin app requires the server</h2><p>${FILE_ORIGIN_MESSAGE}</p><pre>cd backend\nnpm install\nnpm run dev</pre></div>`;
  });
}

const API_BASE = window.LANDLINE_API_BASE || `${location.origin}/api`;
const Auth = {
  getToken: () => null,
  setToken: () => {},
  clearToken: () => {},
  getUser() {
    try {
      return JSON.parse(sessionStorage.getItem('landline_admin_user') || 'null');
    } catch {
      return null;
    }
  },
  setUser: (user) => sessionStorage.setItem('landline_admin_user', JSON.stringify(user)),
  clearUser: () => sessionStorage.removeItem('landline_admin_user')
};

function requireAuth() {
  if (IS_FILE_ORIGIN) return Promise.resolve(null);
  return apiRequest('/auth/me')
    .then((response) => {
      Auth.setUser(response.user);
      return response.user;
    })
    .catch(() => null);
}

async function apiRequest(path, { method = 'GET', body, isForm = false } = {}) {
  if (IS_FILE_ORIGIN) throw new Error(FILE_ORIGIN_MESSAGE);
  const headers = {};
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });
  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    Auth.clearUser();
    if (!location.pathname.endsWith('login.html')) location.replace('login.html');
    throw new Error(data?.message || 'Session expired.');
  }
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}

function toast(message, type = 'success') {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(stack);
  }
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.setAttribute('role', type === 'error' ? 'alert' : 'status');
  item.textContent = message;
  stack.appendChild(item);
  setTimeout(() => item.remove(), 4000);
}

const SIDEBAR_LINKS = [
  { href: 'dashboard.html', label: 'Dashboard', icon: '◦' },
  { href: 'properties.html', label: 'Properties', icon: '⌂' },
  { href: 'leads.html', label: 'Leads & Enquiries', icon: '✉' }
];

function renderShell(activeHref) {
  const mount = document.getElementById('sidebar-mount');
  if (!mount) return;
  const active = activeHref || location.pathname.split('/').pop() || 'dashboard.html';
  mount.innerHTML = `<aside class="sidebar" id="sidebar"><div class="sidebar-brand">LAND<span>LINE</span> PROPERTIES</div><nav class="sidebar-nav" aria-label="Admin navigation">${SIDEBAR_LINKS.map((link) => `<a href="${link.href}" class="${link.href === active ? 'active' : ''}"${link.href === active ? ' aria-current="page"' : ''}><span aria-hidden="true">${link.icon}</span>${link.label}</a>`).join('')}</nav><div class="sidebar-foot"><a href="../index.html">View Website</a><a href="#" id="logout-link">Logout</a></div></aside>`;

  document.getElementById('logout-link').addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Clear local state even if the server is temporarily unavailable.
    }
    Auth.clearToken();
    Auth.clearUser();
    location.replace('login.html');
  });

  const user = Auth.getUser();
  const chip = document.getElementById('user-chip');
  if (user && chip) chip.innerHTML = `<strong>${escapeHtml(user.name)}</strong> · ${escapeHtml(user.role.replace('_', ' '))}`;

  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('menu-toggle');
  const setOpen = (open) => {
    sidebar.classList.toggle('open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? 'Close admin menu' : 'Open admin menu');
  };
  if (toggle) {
    toggle.setAttribute('type', 'button');
    toggle.setAttribute('aria-controls', 'sidebar');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open admin menu');
    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  }
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (innerWidth <= 900 && sidebar.classList.contains('open') && !event.target.closest('#sidebar') && !event.target.closest('#menu-toggle')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
  addEventListener('resize', () => {
    if (innerWidth > 900) setOpen(false);
  }, { passive: true });
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (number >= 1e7) return `₹${(number / 1e7).toFixed(2)} Cr`;
  if (number >= 1e5) return `₹${(number / 1e5).toFixed(2)} Lakh`;
  return `₹${number.toLocaleString('en-IN')}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}
