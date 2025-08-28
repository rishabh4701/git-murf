import React, { useState } from "react";

function App() {
  const [prNumber, setPrNumber] = useState("");     // Store the PR number user types
  const [summary, setSummary] = useState("");       // Store summary from backend
  const [audioUrl, setAudioUrl] = useState("");     // Store audio URL from Murf
  const [loading, setLoading] = useState(false);    // Loading state

  const handleSummarize = async () => {
    if (!prNumber) {
      alert("Please enter a Pull Request number!");
      return;
    }

    setLoading(true);
    setSummary("");
    setAudioUrl("");

    try {
      const response = await fetch("http://localhost:5000/api/summarize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  prUrl: prNumber,   // directly send the entered URL
}),

});


      const data = await response.json();
      if (data.error) {
  alert("Error: " + (typeof data.error === "string" ? data.error : JSON.stringify(data.error)));
} else {
  setSummary(data.summary || "No summary received.");
  setAudioUrl(data.audioUrl || "");

      }
    } catch (err) {
      console.error("❌ Error fetching summary:", err);
      alert("Something went wrong! Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "Arial" }}>
      <h1>🔮 Git Oracle</h1>
      <p>Enter a Pull Request number and hear its summary!</p>

      <input
  type="text"
  value={prNumber}
  onChange={(e) => setPrNumber(e.target.value)}
  placeholder="Enter full PR URL (e.g. https://github.com/user/repo/pull/23)"
  style={{ padding: "10px", width: "350px", marginRight: "10px" }}
/>

      <button
        onClick={handleSummarize}
        style={{
          padding: "10px 20px",
          backgroundColor: "purple",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Summarize
      </button>

      {loading && <p>⏳ Summarizing...</p>}

      {summary && (
        <div style={{ marginTop: "30px" }}>
          <h2>Summary</h2>
          <p>{summary}</p>
        </div>
      )}

      {audioUrl && (
        <div style={{ marginTop: "20px" }}>
          <h2>🔊 Listen</h2>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  );
}

export default App;
