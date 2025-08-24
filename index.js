const express = require("express");
const axios = require("axios");
const cors = require("cors"); 
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors()); 
app.use(express.json()); 

app.post("/api/summarize", async (req, res) => {
  try {
    // 1. SETUP & INITIALIZATION 
    const { prUrl } = req.body;
    if (!prUrl) {
      return res.status(400).json({ error: "prUrl is required" });
    }

    const GITHUB_TOKEN = process.env.GITHUB_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const MURF_API_KEY = process.env.MURF_API_KEY;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const murfUrl = "https://api.murf.ai/v1/speech/generate";
    
    const voicePalette = {
      Positive: { voiceId: 'en-US-iris',style: 'Friendly' },
      Neutral:  { voiceId: 'en-IN-aarav', style: 'Conversational' },
      Negative: { voiceId: 'en-US-julia', style: 'Angry' } 
    };

    // 2. GITHUB: FETCH PR DATA 
    console.log('1. Parsing and fetching from GitHub...');
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return res.status(400).json({ error: "Invalid GitHub PR URL" });
    }
    const [, owner, repo, prNumber] = match;

    const prResp = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "Git-Oracle-App" } }
    );
    const commentsResp = await axios.get(prResp.data.comments_url, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "Git-Oracle-App" },
    });
    
    const prTitle = prResp.data.title;
    const prBody = prResp.data.body || "No description provided.";
    const comments = commentsResp.data.map(c => `${c.user.login}: ${c.body}`).join('\n---\n');
    const fullText = `Title: ${prTitle}\n\nDescription: ${prBody}\n\nComments:\n${comments}`;
    
    // 3. GEMINI: SENTIMENT ANALYSIS 
    console.log('2. Analyzing sentiment...');
    const sentimentPrompt = `Analyze the sentiment of the following GitHub comments. Respond with only a single word: "Positive", "Negative", or "Neutral".\n\nComments:\n${comments}`;
    const sentimentResponse = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: sentimentPrompt }] }],
    });
    const sentiment = sentimentResponse.data.candidates[0].content.parts[0].text.trim().replace(/"/g, '');
    const selectedVoice = voicePalette[sentiment] || voicePalette.Neutral;
    console.log(`Sentiment detected: ${sentiment}. Voice selected: ${selectedVoice.voiceId} (${selectedVoice.style})`);

    // 4. GEMINI: SUMMARIZATION 
    console.log('3. Summarizing text...');
    const summaryPrompt = `Concisely summarize the following GitHub pull request conversation:\n\n${fullText}`;
    const summaryResponse = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: summaryPrompt }] }],
    });
    const summary = summaryResponse.data.candidates[0].content.parts[0].text;

    // 5. MURF AI: GENERATE SPEECH 
    console.log('4. Generating voice...');
    const murfResp = await axios.post(
      murfUrl,
      {
        text: summary,
        voiceId: selectedVoice.voiceId, 
        style: selectedVoice.style, 
        format: "mp3",
        sampleRate: 44100,
      },
      {
        headers: { "api-key": process.env.MURF_API_KEY, "Content-Type": "application/json" }
      }
    );
    const audioUrl = murfResp.data.audioUrl || murfResp.data.audioFile || null;

    // 6. FINAL RESPONSE 
    console.log('5. Success! Sending data to frontend.');
    return res.json({ summary, audioUrl, sentiment }); 

  } catch (err) {
    console.error("Error in /api/summarize:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || "Something went wrong" });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});