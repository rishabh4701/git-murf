const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors({
  origin: "https://git-oracle-frontend.vercel.app"
}));
app.use(express.json());


const languageVoiceMap = {
  'en': { voiceId: 'en-IN-aarav', style: 'Conversational' },
  'hi': { voiceId: 'hi-IN-ayushi', style: 'Conversational' },
  'es': { voiceId: 'es-ES-elvira', style: 'Conversational' },
  'fr': { voiceId: 'fr-FR-adélie', style: 'Conversational' },
  'de': { voiceId: 'de-DE-matthias', style: 'Conversational' }
};


app.post("/api/summarize", async (req, res) => {
  try {

    const { prUrl, targetLanguage = 'en' } = req.body;
    if (!prUrl) {
      return res.status(400).json({ error: "prUrl is required" });
    }

    const selectedVoice = languageVoiceMap[targetLanguage];
    if (!selectedVoice) {
      return res.status(400).json({ error: "Unsupported language" });
    }


    const GITHUB_TOKEN = process.env.GITHUB_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const MURF_API_KEY = process.env.MURF_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const murfUrl = "https://api.murf.ai/v1/speech/generate";


    console.log('1. Parsing and fetching from GitHub...');
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return res.status(400).json({ error: "Invalid GitHub PR URL" });
    }
    const [, owner, repo, prNumber] = match;

    const prApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    const prResp = await axios.get(prApiUrl, { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "Git-Oracle-App" } });
    const commentsResp = await axios.get(prResp.data.comments_url, { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "Git-Oracle-App" } });
    const diffResp = await axios.get(`${prApiUrl}.diff`, { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "Git-Oracle-App" } });

    const prTitle = prResp.data.title;
    const prBody = prResp.data.body || "No description provided.";
    const comments = commentsResp.data.map(c => `${c.user.login}: ${c.body}`).join('\n---\n');
    const diffText = diffResp.data;
    const fullText = `Title: ${prTitle}\n\nDescription: ${prBody}\n\nComments:\n${comments}\n\nCode Changes (Diff):\n${diffText}`;


    console.log(`2. Summarizing and translating to ${targetLanguage}...`);
    const finalPrompt = `
      You are an expert multilingual AI assistant specialized in summarizing technical content and code changes for a voice application. 

      Your task has three main steps:

      1. Analyze the provided GitHub pull request data (title, description, comments, and code diff) and identify:
        - The key purpose of the PR.
        - Any major bug fixes, feature additions, or improvements.
        - Specific lines or sections in the code where important changes occurred or where issues might arise.
        - Important comments or discussion points from reviewers that impact the PR.

      2. Produce a concise, high-quality, and reliable summary:
        - The summary should provide **clear insights** that allow a user to understand the PR without reading the full content.
        - Highlight the most **impactful code changes** and any areas that require attention.
        - Maintain **plain text** only (no markdown, symbols, asterisks, or backticks) suitable for text-to-speech.

      3. Translate the final summary into the language with the code: "${targetLanguage}":
        - Keep technical and programming terms in English (like 'component', 'API', 'bug fix', 'UI', 'test', 'cache', 'server', 'variable', 'function').

      Output requirements:
      - The final output must be **only the translated summary text**, nothing else.
      - The text must be clean, concise, and ready for reading aloud in a voice application.
      - Avoid any extra explanations or meta-text.

      Now, analyze the following GitHub pull request data and produce a **voice-friendly, actionable summary**:
      ${fullText}
    `;

    const aiResponse = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: finalPrompt }] }],
    });
    const final_text = aiResponse.data.candidates[0].content.parts[0].text.trim();


    console.log(`3. Generating voice with ${selectedVoice.voiceId}...`);
    const murfResp = await axios.post(
      murfUrl,
      {
        text: final_text,
        voiceId: selectedVoice.voiceId,
        style: selectedVoice.style,
        format: "mp3",
        sampleRate: 44100,
      },
      { headers: { "api-key": MURF_API_KEY, "Content-Type": "application/json" } }
    );
    const audioUrl = murfResp.data.audioUrl || murfResp.data.audioFile || null;


    console.log('4. Success! Sending data to frontend.');
    return res.json({ summary: final_text, audioUrl });

  } catch (err) {
    console.error("Error in /api/summarize:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || "Something went wrong" });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});