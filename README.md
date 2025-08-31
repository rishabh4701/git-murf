# 🔮 Git Oracle

Git Oracle is an **AI-powered tool** that summarizes GitHub Pull Requests (PRs) and generates **multilingual voice insights** using Murf AI.  
It helps developers save time by turning long PRs into quick, reliable summaries with audio playback.

---

## ✨ Features
- Summarizes GitHub PRs with key insights  
- Highlights important code changes and reviewer notes  
- Translates summaries into multiple languages  
- Converts summaries into natural voice narration via Murf AI  
- Responsive UI with mobile optimization   

---

## 🛠️ Tech Stack

**Frontend**
- React.js, TailwindCSS, Axios  
- Lottie-React for animations  
- React-Icons for icons  

**Backend**
- Node.js, Express.js  
- Axios for external API calls  
- dotenv, CORS  

**APIs**
- **GitHub API** → Fetch PR data (title, description, comments, diffs)  
- **Google Gemini API** → Generate concise summaries & translations  
- **Murf AI API** → Convert summaries into natural-sounding audio  

---


## ⚙️ Installation

```bash
# Clone repo
git clone https://github.com/your-username/git-oracle.git
cd git-oracle

# Install dependencies
npm install

# Create .env in backend
GITHUB_API_KEY=your_github_token
GEMINI_API_KEY=your_gemini_api_key
MURF_API_KEY=your_murf_api_key

# Run backend
npm run start

# Run frontend
npm start

```
**Acknowledgements**
- **Murf AI** → Speech synthesis
- **Google Gemini** → Summarization & translation
- **GitHub API** → PR data
