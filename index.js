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
      Positive: { voiceId: 'en-US-iris', style: 'Friendly' },
      Neutral:  { voiceId: 'en-IN-aarav', style: 'Conversational' },
      Negative: { voiceId: 'en-US-julia', style: 'Angry' },
      Mixed:    { voiceId: 'en-IN-aarav', style: 'Conversational' }
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
    const diffResp = await axios.get(`${prUrl}.diff`, { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "Git-Oracle-App" } });
    const diffText = diffResp.data;

    const prTitle = prResp.data.title;
    const prBody = prResp.data.body || "No description provided.";
    const comments = commentsResp.data.map(c => `${c.user.login}: ${c.body}`).join('\n---\n');
    const fullText = `Title: ${prTitle}\n\nDescription: ${prBody}\n\nComments:\n${comments}\n\nCode Changes (Diff):\n${diffText}`;

    
    // 3. GEMINI: SENTIMENT ANALYSIS 
    console.log('2. Analyzing sentiment...');
    const sentimentPrompt = `
      You are an expert in analyzing professional communication. The following text is a discussion from a GitHub pull request.
      Analyze the overall sentiment of the comments. A critical comment is not necessarily negative if it's constructive.

      Your task is to respond with ONLY a single word from the following options: "Positive", "Negative", "Neutral", or "Mixed".
      - Use "Positive" for generally encouraging and approved conversations.
      - Use "Negative" for conversations with significant disagreement or problems.
      - Use "Neutral" for purely factual, technical discussions.
      - Use "Mixed" for conversations that contain both strong positive and strong negative elements.

      Here are some examples:
      Example 1: "Comments: LGTM. Great work! Approved." -> Response: Positive
      Example 2: "Comments: This approach is wrong. It will cause performance issues. Please refactor it." -> Response: Negative
      Example 3: "Comments: The TTL is now set to 60 seconds." -> Response: Neutral

      Now, analyze the following comments and provide your single-word response:
      \n\nComments:\n${comments}
    `;
    const sentimentResponse = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: sentimentPrompt }] }],
    });
    const sentiment = sentimentResponse.data.candidates[0].content.parts[0].text.trim().replace(/"/g, '');
    const selectedVoice = voicePalette[sentiment] || voicePalette.Neutral;
    console.log(`Sentiment detected: ${sentiment}. Voice selected: ${selectedVoice.voiceId} (${selectedVoice.style})`);

    // 4. GEMINI: SUMMARIZATION 
    console.log('3. Summarizing text...');
    const summaryPrompt = `
      You are a helpful AI assistant for a voice-based application. Your task is to summarize a GitHub pull request.
      Analyze the provided conversation and code diff.
      
      Your response MUST follow these rules:
      1.  Generate a response in clean, plain text only with the improvements that has to be made if any.
      2.  DO NOT use any markdown, special symbols, asterisks, or backticks. Your entire response will be read aloud by a text-to-speech engine.
      3.  Keep common technical and programming terms (like 'component', 'API', 'variable', 'function', 'database', 'bug fix', 'UI', 'test') in English. Do not translate them.
      
      Now, provide a concise summary of the following pull request:
      \n\n${fullText}
    `;
    
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