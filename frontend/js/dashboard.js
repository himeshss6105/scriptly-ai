// ===================================================================
// dashboard.js — Trend-to-Content console: trend analysis + generation
// ===================================================================

requireAuth();

const toneLabels   = ['Clinical', 'Formal', 'Balanced', 'Friendly', 'Playful'];
const lengthLabels = ['Short', 'Medium', 'Long'];

const TYPE_LABELS = {
  script:  'YouTube Script',
  caption: 'Instagram Caption',
  blog:    'Blog Post',
  thread:  'Tweet Thread',
  email:   'Email / Newsletter',
  ad:      'Ad Copy',
  outline: 'Video Outline',
};

let activeType = 'script';
let history = [];
let activeHistoryId = null;

// ---------- Content type chips ----------
const chipRow = document.getElementById('type-chips');
chipRow.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#type-chips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeType = chip.dataset.type;
});

// ---------- Sliders ----------
const toneSlider = document.getElementById('tone-slider');
const toneVal    = document.getElementById('tone-val');
toneSlider.addEventListener('input', () => {
  toneVal.textContent = toneLabels[toneSlider.value];
});

const lengthSlider = document.getElementById('length-slider');
const lengthVal    = document.getElementById('length-val');
lengthSlider.addEventListener('input', () => {
  lengthVal.textContent = lengthLabels[lengthSlider.value];
});

// ---------- Character count ----------
const promptInput = document.getElementById('prompt-input');
const charCount   = document.getElementById('char-count');
promptInput.addEventListener('input', () => {
  charCount.textContent = `${promptInput.value.length} characters`;
});

// ---------- New draft ----------
document.getElementById('new-draft-btn').addEventListener('click', () => {
  promptInput.value = '';
  charCount.textContent = '0 characters';
  activeHistoryId = null;
  renderHistory();
  showEmptyOutput();
  // Reset trend panel
  document.getElementById('trend-input').value = '';
  document.getElementById('trend-result').classList.add('hidden');
});

// ---------- Trend Intelligence ----------
const trendInput     = document.getElementById('trend-input');
const trendResult    = document.getElementById('trend-result');
const trendLabel     = document.getElementById('trend-label');
const trendInsight   = document.getElementById('trend-insight');
const analyzeTrendBtn = document.getElementById('analyze-trend-btn');
const useTrendBtn    = document.getElementById('use-trend-btn');

analyzeTrendBtn.addEventListener('click', analyseTrend);
trendInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') analyseTrend();
});

async function analyseTrend() {
  const topic = trendInput.value.trim();
  if (!topic) { trendInput.focus(); return; }

  analyzeTrendBtn.disabled = true;
  analyzeTrendBtn.textContent = 'Analysing…';
  trendResult.classList.add('hidden');

  try {
    const res = await fetch(API_BASE + '/content/analyse-trend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify({ topic }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Trend analysis failed.');

    trendLabel.textContent   = data.label   || topic;
    trendInsight.textContent = data.insight || 'No insights available.';
    trendResult.classList.remove('hidden');
  } catch (err) {
    trendLabel.textContent   = topic;
    trendInsight.textContent = err.message;
    trendResult.classList.remove('hidden');
  } finally {
    analyzeTrendBtn.disabled = false;
    analyzeTrendBtn.textContent = 'Analyse trend';
  }
}

useTrendBtn.addEventListener('click', () => {
  const topic   = trendInput.value.trim();
  const insight = trendInsight.textContent;
  const typeName = TYPE_LABELS[activeType] || activeType;
  promptInput.value = `Trending topic: "${topic}"\n\nKey insight: ${insight}\n\nCreate a ${typeName} about this trend that captures audience interest.`;
  charCount.textContent = `${promptInput.value.length} characters`;
  promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  promptInput.focus();
});

// ---------- Output rendering ----------
const outputPanel = document.getElementById('output-panel');

function showEmptyOutput() {
  outputPanel.innerHTML = `
    <div class="output-empty" id="output-empty">
      <div class="core"></div>
      <p>The Core is idle. Describe a brief above and press Generate.</p>
    </div>`;
}

function showThinking() {
  const typeName = TYPE_LABELS[activeType] || activeType;
  outputPanel.innerHTML = `
    <div class="output-empty">
      <div class="core"></div>
      <div class="thinking-row" style="margin-top:14px;">
        <div class="core"></div>
        <span>Drafting your ${typeName}…</span>
      </div>
    </div>`;
}

function showOutput(text) {
  // Render markdown-style newlines as line breaks for readability
  const formatted = escapeHtml(text).replace(/\n/g, '<br>');
  outputPanel.innerHTML = `
    <div class="output-text">${formatted}</div>
    <div class="output-actions">
      <button class="btn btn-ghost" id="copy-btn">Copy</button>
      <button class="btn btn-ghost" id="regen-btn">Regenerate</button>
      <button class="btn btn-ghost" id="download-btn">Download .txt</button>
    </div>`;

  document.getElementById('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(text);
    const b = document.getElementById('copy-btn');
    b.textContent = 'Copied ✓';
    setTimeout(() => (b.textContent = 'Copy'), 1500);
  });
  document.getElementById('regen-btn').addEventListener('click', generate);
  document.getElementById('download-btn').addEventListener('click', () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scriptly-${activeType}-${Date.now()}.txt`;
    a.click();
  });
}

function showError(message) {
  outputPanel.innerHTML = `
    <div class="output-empty">
      <p style="color:var(--danger);">${escapeHtml(message)}</p>
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- History rail ----------
const historyList = document.getElementById('history-list');

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<p class="history-empty">Your generations will appear here.</p>';
    return;
  }
  historyList.innerHTML = history.map(item => `
    <div class="history-item ${item.id === activeHistoryId ? 'active' : ''}" data-id="${item.id}">
      <span class="history-type">${TYPE_LABELS[item.type] || item.type || 'Draft'}</span>
      ${escapeHtml(item.prompt.slice(0, 38))}${item.prompt.length > 38 ? '…' : ''}
    </div>`).join('');
}

historyList.addEventListener('click', (e) => {
  const node = e.target.closest('.history-item');
  if (!node) return;
  const item = history.find(h => h.id === node.dataset.id);
  if (!item) return;
  activeHistoryId = item.id;
  promptInput.value = item.prompt;
  charCount.textContent = `${item.prompt.length} characters`;
  showOutput(item.output);
  renderHistory();
});

async function loadHistory() {
  try {
    const res = await fetch(API_BASE + '/content/history', {
      headers: { Authorization: 'Bearer ' + getToken() },
    });
    if (!res.ok) return;
    const data = await res.json();
    history = data.items || [];
    renderHistory();
  } catch {
    // Backend not reachable — history stays empty locally.
  }
}

// ---------- Generate ----------
async function generate() {
  const prompt = promptInput.value.trim();
  if (!prompt) { promptInput.focus(); return; }

  showThinking();
  document.getElementById('generate-btn').disabled = true;

  try {
    const res = await fetch(API_BASE + '/content/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify({
        prompt,
        type:       activeType,
        tone:       toneLabels[toneSlider.value],
        length:     lengthLabels[lengthSlider.value],
        keepVoice:  document.getElementById('voice-toggle').checked,
        addEmoji:   document.getElementById('emoji-toggle').checked,
        hookOpener: document.getElementById('hook-toggle').checked,
        addCTA:     document.getElementById('cta-toggle').checked,
        platform:   document.getElementById('platform-select').value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'The Core could not generate that.');

    showOutput(data.output);
    const entry = { id: data.id || String(Date.now()), prompt, output: data.output, type: activeType };
    history.unshift(entry);
    activeHistoryId = entry.id;
    renderHistory();
  } catch (err) {
    showError(err.message);
  } finally {
    document.getElementById('generate-btn').disabled = false;
  }
}

document.getElementById('generate-btn').addEventListener('click', generate);
promptInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate();
});

loadHistory();
