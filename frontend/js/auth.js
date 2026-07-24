// ===================================================================
// auth.js — handles the login and signup forms
// ===================================================================

async function postJSON(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong. Try again.');
  }
  return data;
}

function showMsg(el, text, kind) {
  el.textContent = text;
  el.className = 'form-msg ' + (kind || '');
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const msg = document.getElementById('login-msg');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.textContent = 'Connecting to Core…';
    showMsg(msg, '', '');

    try {
      const data = await postJSON('/auth/login', { email, password });
      localStorage.setItem('scriptly_token', data.token);
      localStorage.setItem('scriptly_user', JSON.stringify(data.user));
      showMsg(msg, 'Welcome back. Opening console…', 'success');
      window.location.href = 'dashboard.html';
    } catch (err) {
      showMsg(msg, err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signup-btn');
    const msg = document.getElementById('signup-msg');
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.textContent = 'Building your console…';
    showMsg(msg, '', '');

    try {
      const data = await postJSON('/auth/signup', { name, email, password });
      localStorage.setItem('scriptly_token', data.token);
      localStorage.setItem('scriptly_user', JSON.stringify(data.user));
      showMsg(msg, 'Console ready. Redirecting…', 'success');
      window.location.href = 'dashboard.html';
    } catch (err) {
      showMsg(msg, err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create console';
    }
  });
}

// ===================================================================
// Show/hide password toggle (works on both login and signup forms)
// ===================================================================
const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 10.6a3 3 0 0 0 4.24 4.24"/><path d="M9.9 5.2A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.5 13.5 0 0 1-3.14 4.2M6.6 6.6C3.86 8.2 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 4.06-.8"/></svg>';

document.querySelectorAll('.password-toggle').forEach((btn) => {
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  btn.innerHTML = EYE_OPEN;
  btn.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
});

// ===================================================================
// Google Sign-In
// ===================================================================
async function handleGoogleCredential(response) {
  const msg = document.getElementById('login-msg') || document.getElementById('signup-msg');
  try {
    const data = await postJSON('/auth/google', { idToken: response.credential });
    localStorage.setItem('scriptly_token', data.token);
    localStorage.setItem('scriptly_user', JSON.stringify(data.user));
    if (msg) showMsg(msg, 'Signed in with Google. Opening console…', 'success');
    window.location.href = 'dashboard.html';
  } catch (err) {
    if (msg) showMsg(msg, err.message, 'error');
  }
}

function initGoogleButton() {
  const mount = document.getElementById('google-signin-btn');
  if (!mount || !window.google || !google.accounts || !google.accounts.id) return;

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
  });

  google.accounts.id.renderButton(mount, {
    type: 'standard',
    theme: 'filled_black',
    shape: 'pill',
    size: 'large',
    width: 340,
    text: 'continue_with',
  });
}

if (document.getElementById('google-signin-btn')) {
  window.addEventListener('load', () => {
    // The GSI script loads async — poll briefly until it's ready.
    let attempts = 0;
    const tryInit = setInterval(() => {
      attempts += 1;
      if (window.google && google.accounts && google.accounts.id) {
        clearInterval(tryInit);
        initGoogleButton();
      } else if (attempts > 40) {
        clearInterval(tryInit);
      }
    }, 100);
  });
}
