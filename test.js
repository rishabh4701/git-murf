// Load environment variables
require("dotenv").config();

// Print diagnostics
console.log("Murf Key:", process.env.MURF_API_KEY ? "Loaded ✅" : "Missing ❌");
console.log("GitHub Key:", process.env.GITHUB_API_KEY ? "Loaded ✅" : "Missing ❌");
console.log("Gemini Key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

// Function to fetch the latest PR
async function run() {
  try {
    const url = "https://api.github.com/repos/nodejs/node/pulls?per_page=1";

    const response = await fetch(url, {
      headers: {
        "Authorization": `token ${process.env.GITHUB_API_KEY}`,
        "User-Agent": "my-app"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.length > 0) {
      console.log("Latest PR:", data[0].number, "-", data[0].title);
    } else {
      console.log("No PRs found.");
    }
  } catch (err) {
    console.error("❌ FAILED!", err.message);
  }
}

// Run the function
run();
