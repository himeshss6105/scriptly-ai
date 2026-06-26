// ===================================================================
// main.js — shared behavior across every Scriptly.AI page
// ===================================================================

const API_BASE = window.location.origin + '/api';

/** Read the stored auth token, if any. */
function getToken() {
  return localStorage.getItem('scriptly_token');
}

/** Read the stored user object, if any. */
function getUser() {
  const raw = localStorage.getItem('scriptly_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/** Guard a page that requires login — redirects to login.html if missing. */
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

/** Wire up the shared logout button, if present on the page. */
function wireLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('scriptly_token');
    localStorage.removeItem('scriptly_user');
    window.location.href = 'login.html';
  });
}

/** Drop the user's name into a greeting element, if present. */
function wireGreeting() {
  const el = document.getElementById('user-greeting');
  const user = getUser();
  if (el && user?.name) {
    el.textContent = user.name.split(' ')[0];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  wireLogout();
  wireGreeting();
});
