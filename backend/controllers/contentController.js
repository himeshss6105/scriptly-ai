const Content = require('../models/Content');
const { generateContent, analyseTrend, generateScreenplay } = require('../services/geminiService');

async function generate(req, res) {
  try {
    const { prompt, type, tone, length, keepVoice, addEmoji, hookOpener, addCTA, platform } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: 'Describe what you need before generating.' });
    }

    const output = await generateContent({ prompt, type, tone, length, keepVoice, addEmoji, hookOpener, addCTA, platform });

    let saved = null;
    try {
      saved = await Content.create({ user: req.userId, prompt, output, type, tone, length, platform: platform || '' });
    } catch {
      // Database hiccup — still return the generation so the user isn't blocked.
    }

    res.json({ output, id: saved ? saved._id : undefined, quota: req.quota });
  } catch (err) {
    res.status(502).json({
      message: 'The Core could not reach the AI model. Check the server\'s GEMINI_API_KEY.',
      detail: err.message,
    });
  }
}

async function history(req, res) {
  try {
    const items = await Content.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      items: items.map((i) => ({
        id:     i._id,
        prompt: i.prompt,
        output: i.output,
        type:   i.type,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load history.', detail: err.message });
  }
}

async function analyseRoute(req, res) {
  try {
    const { topic } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Provide a topic or URL to analyse.' });
    }

    const result = await analyseTrend(topic.trim());
    res.json(result);
  } catch (err) {
    res.status(502).json({
      message: 'Trend analysis failed. Check GEMINI_API_KEY.',
      detail: err.message,
    });
  }
}

module.exports = { generate, history, analyseRoute, screenplay };

async function screenplay(req, res) {
  try {
    const { transcript, rewriteNote, previousScript } = req.body;

    if (!rewriteNote && (!transcript || !transcript.trim())) {
      return res.status(400).json({ message: 'Record or describe the scene before generating.' });
    }
    if (rewriteNote && !previousScript) {
      return res.status(400).json({ message: 'No existing scene to rewrite.' });
    }

    const output = await generateScreenplay({ transcript, rewriteNote, previousScript });

    let saved = null;
    try {
      saved = await Content.create({
        user: req.userId,
        prompt: rewriteNote ? `[Rewrite: ${rewriteNote}]` : transcript,
        output,
        type: 'screenplay',
      });
    } catch {
      // Database hiccup — still return the generation so the user isn't blocked.
    }

    res.json({ output, id: saved ? saved._id : undefined, quota: req.quota });
  } catch (err) {
    res.status(502).json({
      message: 'The Core could not generate that scene. Check the server\'s GEMINI_API_KEY.',
      detail: err.message,
    });
  }
}
