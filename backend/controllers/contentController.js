const Content = require('../models/Content');
const { generateContent, analyseTrend, generateScreenplay, generateAdCampaign } = require('../services/geminiService');

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
    const { section } = req.query;

    let filter = { user: req.userId };
    if (section === 'director') {
      filter.type = 'screenplay';
    } else if (section === 'adcreator') {
      filter.type = 'ad-campaign';
    } else if (section === 'console') {
      filter.type = { $nin: ['screenplay', 'ad-campaign'] };
    }
    // if no section is passed, falls back to old behavior (everything)

    const items = await Content.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      items: items.map((i) => ({
        id: i._id,
        prompt: i.prompt,
        output: i.output,
        type: i.type,
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

module.exports = { generate, history, analyseRoute, screenplay, adCampaign };

async function adCampaign(req, res) {
  try {
    const { productName, audience, platform, offer, tone, variations } = req.body;
    if (!productName || !productName.trim()) {
      return res.status(400).json({ message: 'Tell me what product or service the ad is for.' });
    }

    const results = await generateAdCampaign({ productName, audience, platform, offer, tone, variations });

    let saved = null;
    try {
      saved = await Content.create({
        user: req.userId,
        prompt: `[Ad Creator] ${productName}`,
        output: JSON.stringify(results),
        type: 'ad-campaign',
        tone: tone || 'Balanced',
        platform: platform || '',
      });
    } catch {
      // Database hiccup — still return the generation so the user isn't blocked.
    }

    res.json({ variations: results, id: saved ? saved._id : undefined, quota: req.quota });
  } catch (err) {
    res.status(502).json({
      message: 'The Core could not generate that campaign. Check the server\'s GEMINI_API_KEY.',
      detail: err.message,
    });
  }
}

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
