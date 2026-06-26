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
