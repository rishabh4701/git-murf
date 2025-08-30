const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


const languageVoiceMap = {
  'en': { voiceId: 'en-IN-aarav', style: 'Conversational' },
  'hi': { voiceId: 'hi-IN-ayushi', style: 'Conversational' }, 
  'es': { voiceId: 'es-ES-elvira', style: 'Conversational' },
  'fr': { voiceId: 'fr-FR-adélie',style: 'Conversational' },
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
      You are an expert multilingual AI assistant. Your primary function is to summarize and translate technical text for a voice application.
      
      Your task has two steps:
      1. First, internally create a concise summary of the provided GitHub pull request data.
      2. Second, you MUST translate that summary into the language with the code: "${targetLanguage}".
      
      Your final output MUST be ONLY the translated text and nothing else.
      
      CRITICAL RULES for the final output:
      - The text must be clean, plain text, suitable for a text-to-speech engine (NO markdown, symbols, asterisks, or backticks).
      - When translating, keep common English technical and programming terms (like 'component', 'API', 'bug fix', 'UI', 'test', 'cache', 'server', 'variable', 'function') in their original English form.
      
      Example:
      If the English summary is "This bug fix for the UI component is approved" and the target language is "hi", your final output should be "यह UI component के लिए bug fix स्वीकृत है।".

      Now, process the following data and provide only the final, translated summary:
      \n\n${fullText}
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