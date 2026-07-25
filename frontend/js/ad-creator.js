// ===================================================================
// ad-creator.js — handles the dedicated Ad Creator page
// ===================================================================

requireAuth();
wireLogout();
wireGreeting();

function showMsg(el, text, kind) {
  el.textContent = text;
  el.className = 'form-msg ' + (kind || '');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const adForm       = document.getElementById('ad-form');
const genBtn        = document.getElementById('ad-generate-btn');
const msgEl         = document.getElementById('ad-msg');
const emptyState    = document.getElementById('ad-results-empty');
const resultsGrid   = document.getElementById('ad-results-grid');

function renderVariations(variations) {
  resultsGrid.innerHTML = variations.map((v, i) => `
    <div class="glass ad-card">
      <div class="ad-card-angle">${escapeHTML(v.angle || `Variation ${i + 1}`)}</div>
      <div class="ad-card-headline">${escapeHTML(v.headline || '')}</div>
      <div class="ad-card-body">${escapeHTML(v.body || '')}</div>
      <span class="ad-card-cta">${escapeHTML(v.cta || '')}</span>
      <button type="button" class="ad-card-copy" data-index="${i}">Copy ↗</button>
    </div>
  `).join('');

  emptyState.classList.add('hidden');
  resultsGrid.classList.remove('hidden');

  resultsGrid.querySelectorAll('.ad-card-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = variations[btn.dataset.index];
      const text = `${v.headline}\n\n${v.body}\n\n${v.cta}`;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied ✓';
        setTimeout(() => { btn.textContent = 'Copy ↗'; }, 1500);
      });
    });
  });
}

adForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const productName = document.getElementById('ad-product').value.trim();
  const audience     = document.getElementById('ad-audience').value.trim();
  const platform     = document.getElementById('ad-platform').value;
  const offer        = document.getElementById('ad-offer').value.trim();
  const tone         = document.getElementById('ad-tone').value;
  const variations   = document.getElementById('ad-variations').value;

  if (!productName) {
    showMsg(msgEl, 'Tell me what product or service the ad is for.', 'error');
    return;
  }

  genBtn.disabled = true;
  genBtn.textContent = 'Generating campaign…';
  showMsg(msgEl, '', '');

  try {
    const res = await fetch(API_BASE + '/content/ad-campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify({ productName, audience, platform, offer, tone, variations }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || 'Something went wrong generating the campaign.');
    }

    renderVariations(data.variations);
    showMsg(msgEl, `Generated ${data.variations.length} variations.`, 'success');
  } catch (err) {
    showMsg(msgEl, err.message, 'error');
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = 'Generate campaign ↗';
  }
});
