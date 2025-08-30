import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./index.css";
import Lottie from "lottie-react";
import discoAnim from "./assets/ball.json";
import { FaPlay, FaPause, FaCircleInfo } from "react-icons/fa6";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

export default function App() {
  const [prUrl, setPrUrl] = useState(() => localStorage.getItem("prUrl") || "");
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
  const [summary, setSummary] = useState(() => localStorage.getItem("summary") || "");
  const [audioUrl, setAudioUrl] = useState(() => localStorage.getItem("audioUrl") || "");
  const [loading, setLoading] = useState(false);

  const audioRef = useRef(null);
  const [currentWord, setCurrentWord] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => localStorage.setItem("prUrl", prUrl), [prUrl]);
  useEffect(() => localStorage.setItem("language", language), [language]);
  useEffect(() => localStorage.setItem("summary", summary), [summary]);
  useEffect(() => localStorage.setItem("audioUrl", audioUrl), [audioUrl]);

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };


  function extractHighlights(text, max = 3) {
    if (!text) return [];
    const candidates = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    return candidates.slice(0, max);
  }

  const handleSummarize = async () => {
    if (!prUrl) return alert("Please paste a GitHub PR URL.");
    setLoading(true);
    setSummary("");
    setAudioUrl("");
    try {
      const res = await axios.post(`${API_BASE}/api/summarize`, {
        prUrl,
        targetLanguage: language,
      });
      if (res.data?.error) {
        alert("Error: " + (res.data.error.message || JSON.stringify(res.data.error)));
      } else {
        setSummary(res.data.summary || "");
        setAudioUrl(res.data.audioUrl || "");
      }
    } catch (err) {
      console.error("Summarize error:", err.response?.data || err.message);
      alert("Summarization failed — check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPrUrl("");
    setSummary("");
    setAudioUrl("");
    localStorage.removeItem("prUrl");
    localStorage.removeItem("summary");
    localStorage.removeItem("audioUrl");
  };

  const highlights = extractHighlights(summary, 3);


  useEffect(() => {
    if (!audioRef.current || !summary) return;

    const words = summary.split(/\s+/);
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (!audio.duration) return;
      const wordDuration = audio.duration / words.length;
      const currentIndex = Math.floor(audio.currentTime / wordDuration);
      setCurrentWord(currentIndex);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [summary]);

  return (
    <div className="min-h-screen w-full font-sans text-sm text-gray-100 bg-[#0d1117]">

      <header className="topbar">
        <div className="brand">
          <div className="h-20 w-20">
            <Lottie animationData={discoAnim} loop={true} />
          </div>
          <div>
            <div className="brand-title">Git Oracle</div>
            <div className="brand-sub">PR summarizer • Voice-Ready • Multilingual</div>
          </div>
        </div>
      </header>


      <main className="workspace ">
        <section className="panel input-panel ">
          <div className="panel-left">
            <label className="label">GitHub PR URL</label>
            <input
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/user/repo/pull/123"
              className="input"
            />

            <label className="label mt-4">Language</label>
            <div className="select-row">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="select"
              >
                <option className = "bg-gray-900 text-white" value="en">English</option>
                <option className = "bg-gray-900 text-white" value="hi">Hindi</option>
                <option className = "bg-gray-900 text-white" value="es">Spanish</option>
                <option className = "bg-gray-900 text-white" value="fr">French</option>
                <option className = "bg-gray-900 text-white" value="de">German</option>
              </select>

              <button
                className="btn-primary"
                onClick={handleSummarize}
                disabled={loading}
              >
                {loading ? <span className="loader-inline" /> : "Summarize"}
              </button>

              <button className="btn-ghost ml-2" onClick={handleClear}>
                Clear
              </button>
            </div>

            <div className="note mt-6 flex items-center space-x-2">
              <FaCircleInfo />
              <span>Choose language first — summary will be translated & voiced in that language.</span>
            </div>

          </div>

          <div className="panel-right">
            <div className="panel-card">
              <div className="card-title">Quick insights</div>
              {loading ? (
                <div className="card-loading">
                  <svg className="ring" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20"></circle>
                  </svg>
                  <div>Generating Summary</div>
                </div>
              ) : highlights.length ? (
                <ul className="highlights">
                  {highlights.map((h, i) => (
                    <li key={i}>
                      <span className="badge">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="muted">No summary yet — paste a PR URL and click Summarize.</div>
              )}
            </div>
          </div>
        </section>

        <section className="panel output-panel">
          <div className="output-card">
            <div className="output-header">
              <div>
                <div className="output-title">Summary ({language.toUpperCase()})</div>
                <div className="output-sub">{summary ? "Generated from PR" : "Awaiting input"}</div>
              </div>

              <div className="output-controls">
                {audioUrl && (
                  <div className="voice-player">
             
                    <button
                      className="vp-btn"
                      onClick={() => {
                        if (audioRef.current.paused) {
                          audioRef.current.play();
                        } else {
                          audioRef.current.pause();
                        }
                      }}
                    >
                      {audioRef.current && !audioRef.current.paused ? (
                        <FaPause size={18} />
                      ) : (
                        <FaPlay size={18} />
                      )}
                    </button>

                    
                    <input
                      type="range"
                      className="vp-progress"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={(e) => {
                        audioRef.current.currentTime = e.target.value;
                        setCurrentTime(e.target.value);
                      }}
                    />

                   
                    <span className="vp-time">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={() => setCurrentTime(audioRef.current.currentTime)}
                      onLoadedMetadata={() => setDuration(audioRef.current.duration)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="output-body">
              {summary ? (
                <div className="summary-text leading-relaxed">
                  {summary.split(/\s+/).map((word, idx) => (
                    <span
                      key={idx}
                      className={`
                          transition-colors 
                          ${idx < currentWord ? "font-bold text-green-400" : "text-gray-300"} 
                          ${idx === currentWord ? "font-bold text-green-500" : ""} 
                        }`}
                    >
                      {word + " "}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="muted">Your summary will appear here once generated.</div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>Made by Uncut Gems 💎</div>
      </footer>
    </div>
  );
}
