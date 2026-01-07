import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import {
  Layout, Sparkles, Trash2, ToggleLeft, ToggleRight,
  Printer, Image as ImageIcon, Lightbulb, MapPin,
  Clock, User, HelpCircle, Utensils, Download, AlertTriangle,
  Palette, Command, Loader
} from 'lucide-react';

// --- CUSTOM BRAND ASSETS ---

// Updated Logo: "The Infinite Bridge"
// Symbolizes: Strong scaffolding (wide base) leading to a future goal (vanishing point).
const ArcLogo = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    <defs>
      {/* Gradient emphasizes the transition from 'Now' (Solid) to 'Future' (Ethereal) */}
      <linearGradient id="bridge-gradient" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="currentColor" stopOpacity="1" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.5" />
      </linearGradient>
    </defs>

    {/* Geometry: A 3D-like arch path.
      - Starts wide at the bottom-left (4,30) to (12,30) -> The Foundation.
      - Curves sharply upward and inward.
      - Converges to a single point at top-right (28,4) -> The Infinite Future.
    */}
    <path
      d="M4 30 L12 30 C 18 20, 24 10, 28 4 C 20 8, 10 16, 4 30 Z"
      fill="url(#bridge-gradient)"
    />

    {/* Optional: A subtle 'keystone' line to emphasize structure */}
    <path d="M10 24 L14 22" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
  </svg>
);

// --- HELPERS ---

const getBase64FromUrl = async (url) => {
  try {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
    });
  } catch (e) {
    console.error("Image load failed", e);
    return null;
  }
};

// "SmartTags" - Minimalist/Monochrome Version
const getCategoryBadge = (text) => {
  if (!text) return { label: "detail", icon: <HelpCircle size={10} />, class: "badge-detail" };
  const lower = text.toLowerCase();

  if (lower.includes('where') || lower.includes('place'))
    return { label: "location", icon: <MapPin size={10} />, class: "badge-zinc" };

  if (lower.includes('who'))
    return { label: "character", icon: <User size={10} />, class: "badge-zinc" };

  if (lower.includes('what') && (lower.includes('eat') || lower.includes('food')))
    return { label: "food", icon: <Utensils size={10} />, class: "badge-zinc" };

  if (lower.includes('when') || lower.includes('time'))
    return { label: "time", icon: <Clock size={10} />, class: "badge-zinc" };

  return { label: "detail", icon: <HelpCircle size={10} />, class: "badge-detail" };
};

export default function App() {
  // --- STATE ---
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_key') || '');
  const [transcript, setTranscript] = useState('');
  const [activityType, setActivityType] = useState('comprehension');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [isScaffolded, setIsScaffolded] = useState(false);
  const [loading, setLoading] = useState(false);

  // The Data
  const [activity, setActivity] = useState(null);
  const [history, setHistory] = useState([]);

  // Visual Assets
  const [mascotUrl, setMascotUrl] = useState(null);
  const [themeColors, setThemeColors] = useState({ primary: '#09090b', accent: '#71717a' });

  // Load History Safely
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lesson_history') || '[]');
      if (Array.isArray(saved)) {
        setHistory(saved);
      }
    } catch (e) {
      console.error("History corrupted, clearing", e);
      localStorage.setItem('lesson_history', '[]');
    }
  }, []);

  // Save Key
  useEffect(() => {
    localStorage.setItem('gemini_key', apiKey);
  }, [apiKey]);

  // --- ACTIONS ---
  const addToHistory = (newActivity, visualData) => {
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      ...newActivity,
      visuals: visualData
    };
    const updated = [newEntry, ...history];
    setHistory(updated);
    localStorage.setItem('lesson_history', JSON.stringify(updated));
  };

  const loadFromHistory = (item) => {
    if (!item || !item.student_worksheet) {
      alert("This saved lesson is corrupt or from an old version.");
      return;
    }
    setActivity(item);
    if (item.visuals) {
      setMascotUrl(item.visuals.mascotUrl);
      setThemeColors(item.visuals.themeColors || { primary: '#09090b' });
    }
    if (item.meta) {
      setCefrLevel(item.meta.level || 'B1');
      setActivityType(item.meta.type || 'comprehension');
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all saved lessons?")) {
      setHistory([]);
      setActivity(null);
      localStorage.setItem('lesson_history', '[]');
    }
  };

  // --- AI ENGINE ---
  const generateActivity = async () => {
    if (!apiKey) return alert("Please enter API Key");
    setLoading(true);
    setActivity(null);
    setMascotUrl(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      let typePrompt = "";
      switch (activityType) {
        case 'vocabulary': typePrompt = "FOCUS: VOCABULARY. Extract 8-10 difficult words. Create matching questions."; break;
        case 'grammar': typePrompt = "FOCUS: GRAMMAR. Identify tense/structures. Create fill-in-the-blanks."; break;
        case 'true_false': typePrompt = "FOCUS: TRUE/FALSE. Create 10 statements."; break;
        case 'discussion': typePrompt = "FOCUS: SPEAKING. Create discussion prompts."; break;
        default: typePrompt = "FOCUS: COMPREHENSION. Standard open questions.";
      }

      const scaffoldPrompt = isScaffolded
        ? "SCAFFOLDING: ON. Hints, Multiple Choice, Simplified Text."
        : "SCAFFOLDING: OFF. Standard.";

      const prompt = `
        You are "arc", an advanced Lesson Architect AI.
        TEXT: "${transcript}"
        CONFIG: ${typePrompt} | Level: ${cefrLevel} | ${scaffoldPrompt}
        
        TASK:
        1. Create the lesson content.
        2. DESIGN A VISUAL THEME based on the story. 
           - Pick a "primary_color" hex code (darker/professional tones preferred).
           - Write a "mascot_prompt": A description for an AI image generator to create a minimal vector illustration.
        
        OUTPUT JSON ONLY:
        {
          "title": "Title",
          "meta": { "level": "${cefrLevel}", "type": "${activityType}", "duration": "20m" },
          "visual_theme": {
            "primary_color": "#hexcode",
            "mascot_prompt": "description of illustration"
          },
          "teacher_guide": { "rationale": "...", "key_answers": ["..."] },
          "student_worksheet": {
            "instructions": "...",
            "questions": [
              { "question_text": "...", "options": ["A","B"], "hint": "...", "type": "standard" }
            ],
            "glossary": [{ "word": "...", "definition": "..." }]
          }
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);

      if (!data.student_worksheet) throw new Error("Invalid AI response structure");

      setActivity(data);
      setThemeColors({ primary: '#09090b', accent: data.visual_theme?.primary_color || '#4f46e5' });

      // Image Gen (Minimalist/Vector style)
      const promptEncoded = encodeURIComponent((data.visual_theme?.mascot_prompt || "abstract concept") + " minimal vector line art, white background, black ink style");
      const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=400&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

      setMascotUrl(imageUrl);
      addToHistory(data, { mascotUrl: imageUrl, themeColors: { primary: '#09090b' } });

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- PDF ENGINE (BRANDED) ---
  const downloadPDF = async () => {
    if (!activity) return;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Layout
    const sidebarW = (width - (margin * 2)) * 0.30;
    const mainW = (width - (margin * 2)) * 0.65;
    const gutter = (width - (margin * 2)) * 0.05;
    const sidebarX = margin + mainW + gutter;

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };

    // PDF uses the generated accent color for subtle highlights, but Black for main text
    const blackRGB = [9, 9, 11]; // Zinc-950
    const grayRGB = [113, 113, 122]; // Zinc-500

    let cursorY = 0;
    let pageNumber = 1;

    const drawFooter = (pNum) => {
      doc.setFontSize(8);
      doc.setTextColor(...grayRGB);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${pNum}  •  arc / ${activity.title}`, margin, height - 10);
    };

    const drawSidebar = () => {
      let sideY = 55;

      if (activity.student_worksheet.glossary && activity.student_worksheet.glossary.length > 0) {
        doc.setTextColor(...blackRGB);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("VOCABULARY", sidebarX, sideY);

        sideY += 10;
        doc.setTextColor(50, 50, 50);
        activity.student_worksheet.glossary.forEach((item) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(item.word, sidebarX, sideY);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const defLines = doc.splitTextToSize(item.definition, sidebarW);
          doc.text(defLines, sidebarX, sideY + 4);
          sideY += (defLines.length * 4) + 8;
        });
      }
    };

    const checkSpace = (required) => {
      if (cursorY + required > height - 20) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = 20;
        drawSidebar();
      }
    };

    drawSidebar();

    // Header
    doc.setTextColor(...blackRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(activity.title, margin, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayRGB);
    doc.text(`${(activity.meta?.level || 'A1').toUpperCase()}  •  ${(activity.meta?.type || 'LESSON').toUpperCase()}  •  20 MIN`, margin, 30);

    // Subtle divider
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, 38, width - margin, 38);

    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        if (base64Img) {
          doc.addImage(base64Img, 'JPEG', width - margin - 25, 10, 25, 25);
        }
      } catch (e) { console.error(e); }
    }

    cursorY = 55;
    doc.setTextColor(...grayRGB);
    doc.setFontSize(9);
    doc.text("Name ___________________________", margin, cursorY);
    cursorY += 20;

    // Instructions
    doc.setTextColor(...blackRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INSTRUCTIONS", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    const instrLines = doc.splitTextToSize(activity.student_worksheet.instructions, mainW);
    doc.text(instrLines, margin, cursorY);
    cursorY += (instrLines.length * 5) + 15;

    // Questions
    activity.student_worksheet.questions.forEach((q, i) => {
      doc.setFontSize(11);
      const qLines = doc.splitTextToSize(`${i + 1}. ${q.question_text}`, mainW);
      let boxH = (qLines.length * 6) + 10;
      if (q.options) boxH += (q.options.length * 7) + 5;
      else boxH += 15;

      checkSpace(boxH);

      doc.setTextColor(...blackRGB);
      doc.setFont("helvetica", "bold");
      doc.text(qLines, margin, cursorY);

      let localY = cursorY + (qLines.length * 5) + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      if (q.options) {
        q.options.forEach(opt => {
          doc.setDrawColor(200);
          doc.circle(margin + 2, localY - 1, 1.5);
          doc.setTextColor(60);
          doc.text(opt, margin + 8, localY);
          localY += 7;
        });
      } else {
        doc.setDrawColor(230);
        doc.line(margin, localY + 8, margin + mainW, localY + 8);
        localY += 12;
      }

      if (q.hint && isScaffolded) {
        doc.setTextColor(100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(`Hint: ${q.hint}`, margin, localY);
        localY += 8;
      }
      cursorY = localY + 10;
    });

    drawFooter(pageNumber);
    doc.save(`arc_lesson_${activity.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  // --- UI RENDER ---
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ArcLogo />
          <span style={{ fontSize: '1.5rem', letterSpacing: '-0.04em', fontWeight: 600 }}>arc</span>
        </div>

        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label>API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            style={{ fontFamily: 'monospace' }} />
        </div>

        <div className="history-list">
          <div style={{
            fontSize: '0.7rem', fontWeight: '600', marginBottom: '10px',
            textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6
          }}>
            Library
          </div>
          {history.map(item => (
            <div key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: item.visuals?.themeColors?.primary || '#000'
                }}></div>
                <div>
                  <span className="history-title">{item.title}</span>
                  <div className="history-meta">{(item.meta?.level || 'B1').toUpperCase()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={clearHistory} style={{
          marginTop: 'auto', background: 'none', border: 'none',
          color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem',
          display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.8
        }}>
          <Trash2 size={14} /> Clear History
        </button>
      </aside>

      <main className="workspace">
        <div className="editor-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#71717a' }}>
            <Command size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>New Configuration</span>
          </div>

          <div className="input-group">
            <label>Source Material / Topic</label>
            <textarea
              placeholder="Enter text or a topic (e.g., 'The history of the internet' or 'Quantum Physics for kids')..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="input-group">
              <label>Focus</label>
              <select value={activityType} onChange={e => setActivityType(e.target.value)}>
                <option value="comprehension">Comprehension</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="grammar">Grammar</option>
                <option value="discussion">Discussion</option>
              </select>
            </div>
            <div className="input-group">
              <label>CEFR Level</label>
              <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)}>
                <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option>
              </select>
            </div>
          </div>

          <div
            className={`toggle-box ${isScaffolded ? 'active' : ''}`}
            onClick={() => setIsScaffolded(!isScaffolded)}
          >
            {isScaffolded ? <ToggleRight color="black" /> : <ToggleLeft color="#d4d4d8" />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Scaffolding Mode</span>
          </div>

          <button
            className="generate-btn"
            onClick={generateActivity}
            disabled={loading}
            style={{
              background: loading ? '#f4f4f5' : 'black',
              color: loading ? '#a1a1aa' : 'white',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <Loader size={16} className="animate-spin" /> Architects Logic...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <Sparkles size={16} /> Generate Lesson
              </span>
            )}
          </button>
        </div>

        <div className="preview-panel">
          {activity ? (
            <div className="paper">
              {/* HEADER */}
              <div style={{ marginBottom: '40px', borderBottom: '1px solid #e4e4e7', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.03em' }}>{activity.title}</h1>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', color: '#71717a', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ border: '1px solid #e4e4e7', padding: '2px 8px', borderRadius: '4px' }}>{activity.meta?.level}</span>
                      <span style={{ border: '1px solid #e4e4e7', padding: '2px 8px', borderRadius: '4px' }}>{activity.meta?.type?.toUpperCase()}</span>
                    </div>
                  </div>
                  {mascotUrl && (
                    <img src={mascotUrl} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', filter: 'grayscale(100%)' }} />
                  )}
                </div>
              </div>

              {/* INSTRUCTIONS */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#a1a1aa', marginBottom: '8px', textTransform: 'uppercase' }}>Instructions</div>
                <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{activity.student_worksheet?.instructions}</div>
              </div>

              {/* QUESTIONS */}
              <div className="questions-list">
                {activity.student_worksheet?.questions?.map((q, i) => {
                  const badge = getCategoryBadge(q.question_text);
                  return (
                    <div key={i} style={{ marginBottom: '30px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span className={badge.class}>
                          {badge.icon} {badge.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>
                        <span style={{ color: '#d4d4d8', marginRight: '12px' }}>{i + 1}</span>
                        {q.question_text}
                      </div>

                      <div style={{ paddingLeft: '24px' }}>
                        {q.options ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                            {q.options.map(opt => (
                              <div key={opt} style={{
                                padding: '8px 12px', border: '1px solid #f4f4f5', borderRadius: '6px',
                                fontSize: '0.9rem', color: '#52525b', display: 'flex', gap: '12px', alignItems: 'center'
                              }}>
                                <div style={{ width: '14px', height: '14px', border: '1px solid #d4d4d8', borderRadius: '50%' }}></div>
                                {opt}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ borderBottom: '1px solid #f4f4f5', height: '30px', width: '100%' }}></div>
                        )}
                      </div>

                      {q.hint && isScaffolded && (
                        <div style={{
                          marginTop: '12px', marginLeft: '24px',
                          color: '#d97706', fontSize: '0.8rem', display: 'flex', gap: '6px', alignItems: 'center'
                        }}>
                          <AlertTriangle size={12} />
                          <span>Hint: {q.hint}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={downloadPDF} className="download-btn" style={{
                marginTop: '40px', width: '100%', padding: '16px',
                background: '#09090b', color: 'white', border: 'none', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px'
              }}>
                <Download size={18} /> Export as PDF
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', opacity: 0.6, color: '#a1a1aa'
            }}>
              <div style={{
                background: 'white', padding: '30px', borderRadius: '50%',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)', marginBottom: '20px'
              }}>
                <Palette size={48} strokeWidth={1} color="#000" />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#18181b', marginBottom: '8px', fontWeight: 600 }}>Start Your Blueprint</h3>
              <p style={{ maxWidth: '300px', textAlign: 'center', fontSize: '0.9rem' }}>
                Configure the lesson parameters and click Generate to construct a new lesson plan.
              </p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        /* Badge Styles for Monochrome Theme */
        .badge-zinc {
          background-color: #f4f4f5;
          color: #18181b;
          border: 1px solid #e4e4e7;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .badge-detail {
          background-color: white;
          color: #a1a1aa;
          border: 1px solid #f4f4f5;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}