const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-2.5-flash';

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const TYPE_INSTRUCTIONS = {
  script:  'Write a YouTube video script with a clear hook, body sections with timestamps/cues, and a strong CTA at the end.',
  caption: 'Write a scroll-stopping social media caption with a punchy first line, body, and relevant hashtags at the end.',
  blog:    'Write a well-structured blog post with an engaging headline, short paragraphs, and subheadings.',
  thread:  'Write a Twitter/X thread. Number each tweet (1/, 2/, etc.). First tweet is the hook. Last tweet is the call to action.',
  email:   'Write a clear email with Subject:, greeting, body paragraphs, and a sign-off.',
  ad:      'Write punchy ad copy with a headline, two to three body lines, and a strong call to action.',
  outline: 'Write a detailed video content outline with a hook idea, 4–6 sections with bullet-point talking points, and a conclusion.',
};

const LENGTH_GUIDE = {
  Short:  'Keep it under 100 words.',
  Medium: 'Aim for 150–250 words.',
  Long:   'Write 300–500 words, fully developed.',
};

async function generateContent({ prompt, type, tone, length, keepVoice, addEmoji, hookOpener, addCTA, platform }) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured on the server.');

  const platformNote = platform ? `Optimise specifically for ${platform}.` : '';

  const instruction = [
    TYPE_INSTRUCTIONS[type] || TYPE_INSTRUCTIONS.blog,
    `Tone: ${tone || 'Balanced'}.`,
    LENGTH_GUIDE[length] || LENGTH_GUIDE.Medium,
    platformNote,
    keepVoice   ? 'Keep a consistent, natural human voice throughout.' : '',
    addEmoji    ? 'Include a few relevant emoji where they feel natural.' : 'Do not use emoji.',
    hookOpener  ? 'Open with a compelling hook that immediately grabs attention.' : '',
    addCTA      ? 'End with a clear, actionable call to action.' : '',
    'Return only the finished piece of writing — no preamble, no notes, no markdown code fences.',
  ].filter(Boolean).join(' ');

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `${instruction}\n\nBrief from the user: ${prompt}`,
  });

  return response.text;
}

// ===================================================================
// Ad Creator — a dedicated multi-variation ad generator, distinct from
// the generic 'ad' content-type chip. Takes structured campaign inputs
// (product, audience, platform, offer) and returns several ready-to-use
// variations as structured data, not one block of prose.
// ===================================================================

const AD_PLATFORM_NOTES = {
  Instagram: 'Written for an Instagram feed/reel caption — casual, visual-first, hashtag-friendly.',
  Facebook:  'Written for a Facebook feed ad — slightly longer, benefit-led, friendly tone.',
  Google:    'Written for a Google Search ad — headline under 30 characters, description under 90 characters, no fluff.',
  YouTube:   'Written for a YouTube pre-roll/in-stream ad script — spoken, hook in the first 5 seconds.',
  LinkedIn:  'Written for a LinkedIn feed ad — professional, credibility-led, no gimmicks.',
  TikTok:    'Written for a TikTok ad — punchy, trend-aware, native/casual voice, strong opening line.',
  General:   'Written to work across most ad platforms — clear, punchy, and adaptable.',
};

async function generateAdCampaign({ productName, audience, platform, offer, tone, variations }) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured on the server.');

  const count = Math.min(Math.max(parseInt(variations, 10) || 3, 1), 6);
  const platformNote = AD_PLATFORM_NOTES[platform] || AD_PLATFORM_NOTES.General;

  const prompt = `You are an ad copywriter generating a small campaign of ad variations.

Product/service: "${productName}"
Target audience: "${audience || 'a general audience'}"
Offer or call to action to highlight: "${offer || 'no specific offer — focus on the core benefit'}"
Tone: ${tone || 'Balanced'}
Platform: ${platform || 'General'}. ${platformNote}

Generate exactly ${count} distinct ad variations. Each should take a genuinely different angle (e.g. pain-point led, benefit led, social proof, urgency, curiosity) — do not just reword the same idea.

Respond ONLY with a valid JSON object (no markdown, no preamble, no code fences) in this exact shape:
{
  "variations": [
    { "angle": "short 2-4 word label for this angle", "headline": "short punchy headline", "body": "1-3 sentence ad body", "cta": "short call-to-action phrase" }
  ]
}`;

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  const raw = response.text.trim().replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.variations)) throw new Error('Unexpected response shape from the model.');
  return parsed.variations;
}

async function analyseTrend(topic) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured on the server.');

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `You are a trend intelligence engine for a content creation platform.
The user has entered this topic or URL: "${topic}"

Analyse it and respond ONLY with a valid JSON object (no markdown, no preamble) in this exact shape:
{
  "label": "Short 2-5 word trend label",
  "insight": "2-3 sentence summary of why this is trending, who the audience is, and what angle would make the best content"
}

If the topic is a URL, extract the subject matter from it.`,
  });

  const raw = response.text.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
}

// ===================================================================
// Director's Assist — turns a rambling, spoken scene description into
// a properly formatted screenplay scene.
// ===================================================================

const SCREENPLAY_FORMAT_RULES = `You are a professional script supervisor. A film director has just verbally
described a scene out loud, the way they'd brief actors on set — informally,
possibly repeating themselves, restarting sentences, or thinking out loud.
Your job is to turn that spoken description into a properly formatted
screenplay scene, inferring structure the director didn't explicitly state.

Follow real screenplay formatting conventions exactly:
- SLUGLINE: "INT." or "EXT." + LOCATION (all caps) + " – " + "DAY" or "NIGHT" (or DAWN/DUSK if implied). Infer interior/exterior and time of day from context; default to INT. and DAY if truly ambiguous.
- Action lines: present tense, third person, concise. Describe only what is seen or heard.
- Character names: ALL CAPS, centered above their dialogue, on their own line.
- Dialogue: directly below the character name, normal case.
- Parentheticals: short tone/delivery notes in (parentheses), placed on their own line directly under the character name when needed — use sparingly, only when the director's tone implies it (e.g. trembling, whispering, angry).
- Infer character names from context if the director refers to "the hero", "his friend", etc. — give them sensible names if none are stated, or use the role description in caps (e.g. THE HERO) if a name truly cannot be inferred.
- Do not invent major plot events the director didn't describe or imply — format and lightly fill in only what's needed for the scene to read as complete (e.g. a beat of silence, a glance) where the spoken description clearly leaves room for it.
- Return ONLY the formatted screenplay scene. No preamble, no notes, no explanation, no markdown code fences.`;

async function generateScreenplay({ transcript, rewriteNote, previousScript }) {
  const ai = getClient();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured on the server.');

  let contents;
  if (rewriteNote && previousScript) {
    // One-click rewrite: revise an already-generated scene, don't reformat from scratch.
    contents = `${SCREENPLAY_FORMAT_RULES}

Here is a screenplay scene that was already generated:

---
${previousScript}
---

Revise it with this direction: "${rewriteNote}". Keep the same characters, setting, and overall events unless the direction explicitly asks to change them. Keep the same screenplay formatting rules.`;
  } else {
    contents = `${SCREENPLAY_FORMAT_RULES}

Here is the director's spoken scene description (raw transcript, may be informal or repetitive):

"""
${transcript}
"""

Produce the formatted screenplay scene now.`;
  }

  const response = await ai.models.generateContent({ model: MODEL, contents });
  return response.text;
}

module.exports = { generateContent, analyseTrend, generateScreenplay, generateAdCampaign };
