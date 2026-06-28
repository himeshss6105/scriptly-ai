// ===================================================================
// director.js — Director's Assist: voice capture + screenplay generation
// ===================================================================

requireAuth();

const recordBtn      = document.getElementById('record-btn');
const recordStatus    = document.getElementById('record-status');
const recordTimer     = document.getElementById('record-timer');
const transcriptBox   = document.getElementById('transcript-box');
const transcriptCount = document.getElementById('transcript-count');
const generateBtn     = document.getElementById('generate-scene-btn');
const screenplayPanel = document.getElementById('screenplay-panel');
const directorTools   = document.getElementById('director-tools');

let recognition = null;
let isRecording = false;
let timerInterval = null;
let secondsElapsed = 0;
let currentScreenplay = null; // the last generated scene's raw text, used for rewrites

// ---------- Web Speech API setup ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  recordBtn.disabled = true;
  recordStatus.textContent = 'Voice capture isn\'t supported in this browser — try Chrome, or just type your scene below.';
} else {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  // Tracks the transcript text that existed before this recording session started,
  // so re-recording appends rather than overwriting anything typed/generated earlier.
  let baseTranscript = '';

  recognition.onresult = (event) => {
    let finalChunk = '';
    let interimChunk = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalChunk += text;
      else interimChunk += text;
    }
    if (finalChunk) baseTranscript += finalChunk;
    transcriptBox.value = (baseTranscript + interimChunk).trim();
    updateCharCount();
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      recordStatus.textContent = 'Microphone access was blocked — allow it in your browser settings and try again.';
    } else if (event.error === 'no-speech') {
      // Not a real failure — just keep listening, don't alarm the user.
      return;
    } else {
      recordStatus.textContent = `Voice capture hit an error (${event.error}). You can keep typing instead.`;
    }
    stopRecording();
  };

  recognition.onend = () => {
    // Some browsers end the session unexpectedly (e.g. long silence) — restart
    // automatically if the director is still mid-recording rather than stopping early.
    if (isRecording) {
      try { recognition.start(); } catch { /* already running, ignore */ }
    }
  };

  recordBtn.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      baseTranscript = transcriptBox.value ? transcriptBox.value + ' ' : '';
      startRecording();
    }
  });
}

function startRecording() {
  isRecording = true;
  secondsElapsed = 0;
  recordBtn.classList.add('recording');
  recordBtn.setAttribute('aria-label', 'Stop recording');
  recordStatus.textContent = 'Recording — speak naturally, restarts and pauses are fine';
  recordTimer.classList.remove('hidden');
  recordTimer.textContent = '00:00';

  timerInterval = setInterval(() => {
    secondsElapsed += 1;
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    recordTimer.textContent = `${m}:${s}`;
  }, 1000);

  try {
    recognition.start();
  } catch {
    // Recognition may already be in a starting state — safe to ignore.
  }
}

function stopRecording() {
  isRecording = false;
  recordBtn.classList.remove('recording');
  recordBtn.setAttribute('aria-label', 'Start recording');
  recordStatus.textContent = 'Tap to start recording your scene';
  clearInterval(timerInterval);
  if (recognition) {
    try { recognition.stop(); } catch { /* not running, ignore */ }
  }
}

// ---------- Transcript editing ----------
transcriptBox.addEventListener('input', updateCharCount);
function updateCharCount() {
  transcriptCount.textContent = `${transcriptBox.value.length} characters`;
}

// ---------- Screenplay rendering ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderScreenplay(text) {
  currentScreenplay = text;

  // Bold sluglines (INT./EXT. lines) for readability — purely cosmetic, the
  // underlying text sent for rewrites/downloads stays exactly as generated.
  const lines = escapeHtml(text).split('\n');
  const html = lines.map(line => {
    if (/^(INT\.|EXT\.)/.test(line.trim())) {
      return `<span class="slugline">${line}</span>`;
    }
    return line;
  }).join('\n');

  screenplayPanel.innerHTML = `
    <div class="screenplay-page">${html}</div>
    <div class="screenplay-toolbar">
      <button class="btn btn-ghost" id="copy-scene-btn">Copy</button>
      <button class="btn btn-ghost" id="download-scene-btn">Download .txt</button>
    </div>`;

  document.getElementById('copy-scene-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(text);
    const b = document.getElementById('copy-scene-btn');
    b.textContent = 'Copied ✓';
    setTimeout(() => (b.textContent = 'Copy'), 1500);
  });
  document.getElementById('download-scene-btn').addEventListener('click', () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scriptly-scene-${Date.now()}.txt`;
    a.click();
  });

  directorTools.classList.remove('hidden');
}

function showScreenplayThinking(label) {
  screenplayPanel.innerHTML = `
    <div class="screenplay-empty">
      <div class="thinking-row" style="justify-content:center;">
        <div class="core" style="width:28px;height:28px;"></div>
        <span>${label}</span>
      </div>
    </div>`;
}

function showScreenplayError(message) {
  screenplayPanel.innerHTML = `
    <div class="screenplay-empty">
      <p style="color:var(--danger);">${escapeHtml(message)}</p>
    </div>`;
}

// ---------- Generate scene ----------
generateBtn.addEventListener('click', async () => {
  const transcript = transcriptBox.value.trim();
  if (!transcript) { transcriptBox.focus(); return; }
  if (isRecording) stopRecording();

  showScreenplayThinking('Formatting your scene…');
  generateBtn.disabled = true;

  try {
    const res = await fetch(API_BASE + '/content/screenplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'The Core could not format that scene.');
    renderScreenplay(data.output);
  } catch (err) {
    showScreenplayError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
});

// ---------- Director Tools: one-click rewrites ----------
document.querySelectorAll('.tool-chips .chip').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!currentScreenplay) return;
    const note = btn.dataset.note;

    document.querySelectorAll('.tool-chips .chip').forEach(c => (c.disabled = true));
    showScreenplayThinking(`Applying: ${btn.textContent}…`);

    try {
      const res = await fetch(API_BASE + '/content/screenplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
        body: JSON.stringify({ rewriteNote: note, previousScript: currentScreenplay }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'The Core could not apply that rewrite.');
      renderScreenplay(data.output);
    } catch (err) {
      showScreenplayError(err.message);
    } finally {
      document.querySelectorAll('.tool-chips .chip').forEach(c => (c.disabled = false));
    }
  });
});
