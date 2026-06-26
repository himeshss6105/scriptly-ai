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

module.exports = { generateContent, analyseTrend };
