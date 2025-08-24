// index.js
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
app.use(bodyParser.json());

// --- Route: Summarize GitHub PR and generate audio ---
app.post("/api/summarize", async (req, res) => {
  try {
    const { prUrl } = req.body;

    if (!prUrl) {
      return res.status(400).json({ error: "❌ prUrl is required" });
    }

    // Extract repo info from PR URL
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return res.status(400).json({ error: "❌ Invalid GitHub PR URL" });
    }
    const [, owner, repo, prNumber] = match;

    // Fetch PR from GitHub
    const prResp = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_API_KEY}`,
          "User-Agent": "my-app",
        },
      }
    );

    const prTitle = prResp.data.title;
    const prBody = prResp.data.body || "";

    // Simple summary (later: replace with Gemini)
    const summary = `🔎 PR Summary:\n${prTitle}\n\n${prBody.slice(0, 200)}...`;

    // Generate speech with Murf
    const murfResp = await axios.post(
      "https://api.murf.ai/v1/speech/generate",
      {
        text: summary,
        voiceId: "en-IN-aarav",
 // ✅ working sample voice

        format: "mp3",
        sampleRate: 44100,
      },
      {
        headers: {
          "api-key": process.env.MURF_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("🔊 Murf API response:", murfResp.data);

    const audioUrl =
      murfResp.data.audioFileUrl || murfResp.data.data?.url || null;

    return res.json({
      summary,
      audioUrl,
    });
  } catch (err) {
    console.error(
      "❌ Error in /api/summarize:",
      err.response?.data || err.message
    );
    res
      .status(500)
      .json({ error: err.response?.data || "Something went wrong" });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
