import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import {
  Layout, Sparkles, Trash2, ToggleLeft, ToggleRight,
  Printer, Image as ImageIcon, Lightbulb, MapPin,
  Clock, User, HelpCircle, Utensils, Download, AlertTriangle
} from 'lucide-react';

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

// Keyword Detector for Visual Cues (Safe Version)
const getCategoryBadge = (text) => {
  if (!text) return { label: "DETAIL", icon: <HelpCircle size={12} />, color: "bg-slate-100 text-slate-700" };
  const lower = text.toLowerCase();
  if (lower.includes('where') || lower.includes('place') || lower.includes('go')) return { label: "LOCATION", icon: <MapPin size={12} />, color: "bg-blue-100 text-blue-700" };
  if (lower.includes('who')) return { label: "CHARACTER", icon: <User size={12} />, color: "bg-purple-100 text-purple-700" };
  if (lower.includes('what') && (lower.includes('eat') || lower.includes('food'))) return { label: "FOOD", icon: <Utensils size={12} />, color: "bg-orange-100 text-orange-700" };
  if (lower.includes('when') || lower.includes('time')) return { label: "TIME", icon: <Clock size={12} />, color: "bg-amber-100 text-amber-700" };
  return { label: "DETAIL", icon: <HelpCircle size={12} />, color: "bg-slate-100 text-slate-700" };
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
  const [themeColors, setThemeColors] = useState({ primary: '#4f46e5', accent: '#10b981' });

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
    // Safety check before loading
    if (!item || !item.student_worksheet) {
      alert("This saved lesson is corrupt or from an old version.");
      return;
    }
    setActivity(item);
    if (item.visuals) {
      setMascotUrl(item.visuals.mascotUrl);
      setThemeColors(item.visuals.themeColors || { primary: '#4f46e5' });
    }
    if (item.meta) {
      setCefrLevel(item.meta.level || 'B1');
      setActivityType(item.meta.type || 'comprehension');
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all saved lessons? This fixes 'White Screen' errors caused by old data.")) {
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
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        You are a Visual Lesson Architect.
        TEXT: "${transcript}"
        CONFIG: ${typePrompt} | Level: ${cefrLevel} | ${scaffoldPrompt}
        
        TASK:
        1. Create the lesson content.
        2. DESIGN A VISUAL THEME based on the story. 
           - Pick a "primary_color" hex code (e.g. #009246 for Italy).
           - Write a "mascot_prompt": A description for an AI image generator to create a cute header illustration.
        
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
      setThemeColors({ primary: data.visual_theme?.primary_color || '#4f46e5', accent: '#4b5563' });

      // Image Gen
      const promptEncoded = encodeURIComponent((data.visual_theme?.mascot_prompt || "school mascot") + " white background, high quality, vector style, flat illustration");
      const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=400&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

      setMascotUrl(imageUrl);
      addToHistory(data, { mascotUrl: imageUrl, themeColors: { primary: data.visual_theme?.primary_color } });

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- PDF ENGINE (VISUAL SCAFFOLDED) ---
  const downloadPDF = async () => {
    if (!activity) return;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Layout
    const sidebarW = (width - (margin * 2)) * 0.30;
    const mainW = (width - (margin * 2)) * 0.65;
    const gutter = (width - (margin * 2)) * 0.05;
    const sidebarX = margin + mainW + gutter;

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };
    const primaryRGB = hexToRgb(themeColors.primary);
    const slate800 = [30, 41, 59];
    const slate500 = [100, 116, 139];
    const slate100 = [241, 245, 249];

    let cursorY = 0;
    let pageNumber = 1;

    const drawFooter = (pNum) => {
      doc.setFontSize(8);
      doc.setTextColor(...slate500);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${pNum}  •  ${activity.title}`, width - margin, height - 10, { align: 'right' });
      doc.setDrawColor(...primaryRGB);
      doc.setLineWidth(0.5);
      doc.line(margin, height - 15, width - margin, height - 15);
    };

    const drawSidebar = () => {
      doc.setFillColor(250, 250, 250);
      doc.rect(sidebarX - gutter / 2, 0, sidebarW + margin + gutter / 2, height, 'F');

      let sideY = 60;

      if (activity.student_worksheet.glossary && activity.student_worksheet.glossary.length > 0) {
        doc.setFillColor(...primaryRGB);
        doc.rect(sidebarX, sideY, sidebarW, 8, 'F');
        doc.setTextColor(255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("KEY VOCABULARY", sidebarX + 5, sideY + 5.5);

        sideY += 15;
        doc.setTextColor(...slate800);
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

      sideY += 10;
      doc.setDrawColor(...primaryRGB);
      doc.setLineWidth(0.5);
      doc.roundedRect(sidebarX, sideY, sidebarW, 40, 2, 2);
      doc.setTextColor(...primaryRGB);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("QUICK TIPS", sidebarX + 5, sideY + 8);
      doc.setTextColor(...slate500);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize("Look for keywords. Read the story twice.", sidebarW - 10), sidebarX + 5, sideY + 15);
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

    // Helper for badges in PDF (Simplified text version)
    const getPdfBadge = (text) => {
      if (!text) return "DETAIL";
      const lower = text.toLowerCase();
      if (lower.includes('where') || lower.includes('place')) return "LOCATION";
      if (lower.includes('who')) return "CHARACTER";
      if (lower.includes('food') || lower.includes('eat')) return "FOOD";
      if (lower.includes('when')) return "TIME";
      return "DETAIL";
    };

    drawSidebar();
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, width, 40, 'F');
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(activity.title, margin, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${activity.meta?.level || 'A1'} LEVEL  •  ${(activity.meta?.type || 'LESSON').toUpperCase()}`, margin, 28);

    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        if (base64Img) {
          doc.setDrawColor(255);
          doc.setLineWidth(2);
          doc.circle(width - 30, 20, 16, 'S');
          doc.addImage(base64Img, 'JPEG', width - 42, 8, 24, 24);
        }
      } catch (e) { console.error(e); }
    }

    cursorY = 55;
    doc.setTextColor(...slate500);
    doc.setFontSize(9);
    doc.text("Name: ______________________", margin, cursorY);
    doc.text("Date: ______________________", margin + mainW / 2, cursorY);
    cursorY += 15;

    doc.setFillColor(...slate100);
    doc.roundedRect(margin, cursorY, mainW, 25, 2, 2, 'F');
    doc.setTextColor(...primaryRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("INSTRUCTIONS", margin + 5, cursorY + 8);
    doc.setTextColor(...slate800);
    doc.setFont("helvetica", "normal");
    const instrLines = doc.splitTextToSize(activity.student_worksheet.instructions, mainW - 10);
    doc.text(instrLines, margin + 5, cursorY + 16);
    cursorY += 35;

    activity.student_worksheet.questions.forEach((q, i) => {
      doc.setFontSize(11);
      const qLines = doc.splitTextToSize(q.question_text, mainW - 20);
      let boxH = (qLines.length * 6) + 15;
      if (q.options) boxH += (q.options.length * 8) + 5;
      else if (activityType === 'true_false') boxH += 10;
      else boxH += 15;
      if (q.hint && isScaffolded) boxH += 12;

      checkSpace(boxH + 5);

      const cat = getPdfBadge(q.question_text);
      doc.setFillColor(...primaryRGB);
      doc.roundedRect(margin, cursorY, doc.getTextWidth(cat) + 6, 6, 1, 1, 'F');
      doc.setTextColor(255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(cat, margin + 3, cursorY + 4);

      doc.setTextColor(...slate800);
      doc.setFontSize(11);
      doc.text(qLines, margin, cursorY + 12);

      let localY = cursorY + 12 + (qLines.length * 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      if (q.options) {
        q.options.forEach(opt => {
          doc.setDrawColor(...slate500);
          doc.rect(margin, localY - 3, 4, 4);
          doc.setTextColor(...slate500);
          doc.text(opt, margin + 8, localY);
          localY += 7;
        });
      } else if (activityType === 'true_false') {
        doc.rect(margin, localY - 3, 4, 4);
        doc.text("True", margin + 8, localY);
        doc.rect(margin + 30, localY - 3, 4, 4);
        doc.text("False", margin + 38, localY);
        localY += 8;
      } else {
        doc.setDrawColor(200);
        doc.line(margin, localY + 5, margin + mainW, localY + 5);
        localY += 10;
      }

      if (q.hint && isScaffolded) {
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(margin, localY, mainW, 8, 1, 1, 'F');
        doc.setTextColor(180, 83, 9);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`HINT: ${q.hint}`, margin + 5, localY + 5.5);
        localY += 10;
      }
      cursorY = localY + 8;
    });

    drawFooter(pageNumber);

    // TEACHER PAGE
    doc.addPage();
    pageNumber++;
    doc.setFillColor(...slate800);
    doc.rect(0, 0, width, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TEACHER'S COMPANION", margin, 25);

    cursorY = 55;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Pedagogical Focus", margin, cursorY);
    cursorY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const ratLines = doc.splitTextToSize(activity.teacher_guide.rationale, width - (margin * 2));
    doc.text(ratLines, margin, cursorY);
    cursorY += (ratLines.length * 5) + 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Answer Key", margin, cursorY);
    cursorY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (activity.teacher_guide.key_answers) {
      activity.teacher_guide.key_answers.forEach((ans, i) => {
        doc.text(`${i + 1}. ${ans}`, margin, cursorY);
        cursorY += 7;
      });
    }

    drawFooter(pageNumber);
    doc.save(`${activity.title.replace(/\s+/g, '_')}_Visual.pdf`);
  };

  // --- UI RENDER ---
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><Layout /> LessonArchitect</div>
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label style={{ color: '#a5b4fc' }}>API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid #4338ca' }} />
        </div>
        <div className="history-list">
          <div style={{ color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px' }}>HISTORY</div>
          {history.map(item => (
            <div key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* SAFE GUARD: Check visuals existence */}
                {item.visuals?.mascotUrl && <img src={item.visuals.mascotUrl} style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' }} />}
                <div>
                  <span className="history-title">{item.title}</span>
                  {/* SAFE GUARD: Optional Chaining */}
                  <div className="history-meta">{item.meta?.level}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={clearHistory} style={{ marginTop: 'auto', background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' }}><Trash2 size={14} /> Clear / Reset App</button>
      </aside>

      <main className="workspace">
        <div className="editor-panel">
          <h2><Sparkles size={20} style={{ display: 'inline', color: themeColors.primary }} /> Creator Studio</h2>

          <div className="input-group">
            <label>Story / Topic</label>
            <textarea
              placeholder="e.g. Peppa Pig goes to Italy and eats pizza..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="input-group">
              <label>Type</label>
              <select value={activityType} onChange={e => setActivityType(e.target.value)}>
                <option value="comprehension">Comprehension</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="grammar">Grammar</option>
                <option value="discussion">Discussion</option>
              </select>
            </div>
            <div className="input-group">
              <label>Level</label>
              <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)}>
                <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option>
              </select>
            </div>
          </div>

          <div className={`toggle-box ${isScaffolded ? 'active' : ''}`} onClick={() => setIsScaffolded(!isScaffolded)}>
            {isScaffolded ? <ToggleRight color={themeColors.primary} /> : <ToggleLeft color="#ccc" />}
            <span>Scaffolding Mode</span>
          </div>

          <button className="generate-btn" onClick={generateActivity} disabled={loading} style={{ background: themeColors.primary }}>
            {loading ? "Designing & Illustrating..." : "Generate Magic Lesson"}
          </button>
        </div>

        <div className="preview-panel" style={{ background: '#f8fafc', overflowY: 'auto' }}>
          {activity ? (
            <div className="paper-container" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="paper" style={{
                width: '100%', maxWidth: '1000px', background: 'white', minHeight: '1200px',
                boxShadow: '0 20px 50px -10px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden',
                display: 'grid', gridTemplateColumns: '7fr 3fr'
              }}>

                {/* --- LEFT: MAIN CONTENT --- */}
                <div className="main-content" style={{ padding: '40px', borderRight: '1px solid #f1f5f9' }}>

                  {/* HERO HEADER */}
                  <div style={{ background: themeColors.primary, margin: '-40px -40px 30px -40px', padding: '40px', color: 'white' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>{activity.title}</h1>
                    <div style={{ marginTop: '10px', opacity: 0.9, fontSize: '0.9rem', display: 'flex', gap: '15px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>{activity.meta?.level}</span>
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>{activity.meta?.type?.toUpperCase()}</span>
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>20 MIN</span>
                    </div>
                  </div>

                  {/* INSTRUCTIONS */}
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', borderLeft: `4px solid ${themeColors.primary}`, marginBottom: '30px' }}>
                    <div style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px' }}>INSTRUCTIONS</div>
                    <div style={{ color: '#334155' }}>{activity.student_worksheet?.instructions}</div>
                  </div>

                  {/* QUESTIONS */}
                  <div className="questions-list">
                    {activity.student_worksheet?.questions?.map((q, i) => {
                      const badge = getCategoryBadge(q.question_text);
                      return (
                        <div key={i} style={{ marginBottom: '25px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className={`badge ${badge.color}`} style={{
                              fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px',
                              display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase'
                            }}>
                              {badge.icon} {badge.label}
                            </span>
                          </div>

                          <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
                            <span style={{ color: themeColors.primary, marginRight: '8px' }}>{i + 1}.</span>
                            {q.question_text}
                          </div>

                          <div style={{ paddingLeft: '20px' }}>
                            {q.options ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {q.options.map(opt => (
                                  <div key={opt} style={{
                                    padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                    fontSize: '0.9rem', color: '#475569', display: 'flex', gap: '8px', alignItems: 'center'
                                  }}>
                                    <div style={{ width: '12px', height: '12px', border: '1px solid #cbd5e1', borderRadius: '2px' }}></div>
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ borderBottom: '1px dashed #cbd5e1', height: '30px', width: '100%' }}></div>
                            )}
                          </div>

                          {q.hint && isScaffolded && (
                            <div style={{
                              marginTop: '10px', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px',
                              border: '1px solid #fcd34d', display: 'flex', gap: '8px', alignItems: 'center'
                            }}>
                              <Lightbulb size={14} color="#b45309" />
                              <span style={{ fontSize: '0.85rem', color: '#b45309', fontStyle: 'italic' }}>Hint: {q.hint}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* --- RIGHT: SIDEBAR (ACTION & ASSETS) --- */}
                <div className="paper-sidebar" style={{ background: '#f8fafc', padding: '30px' }}>

                  {/* --- DOWNLOAD ACTION --- */}
                  <div style={{ marginBottom: '30px' }}>
                    <button onClick={downloadPDF} className="download-btn" style={{
                      width: '100%', padding: '15px', background: '#0f172a', color: 'white',
                      border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}>
                      <Download size={20} /> Download PDF
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
                      Includes visuals & teacher guide
                    </div>
                  </div>

                  {/* MASCOT */}
                  {mascotUrl && (
                    <div style={{
                      background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      marginBottom: '30px', textAlign: 'center'
                    }}>
                      <img src={mascotUrl} style={{ width: '100%', borderRadius: '8px' }} />
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px', fontWeight: 'bold' }}>LESSON MASCOT</div>
                    </div>
                  )}

                  {/* GLOSSARY */}
                  {activity.student_worksheet?.glossary && (
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{
                        fontSize: '0.8rem', textTransform: 'uppercase', color: themeColors.primary,
                        borderBottom: `2px solid ${themeColors.primary}`, paddingBottom: '8px', marginBottom: '15px'
                      }}>Key Vocabulary</h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activity.student_worksheet.glossary.map((g, i) => (
                          <div key={i}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#334155' }}>{g.word}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>{g.definition}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TEACHER TIPS */}
                  <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', color: '#1e40af' }}>
                      <HelpCircle size={16} />
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Teacher Tip</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: 0 }}>
                      Encourage students to use the category badges to scan for answers quickly.
                    </p>
                  </div>

                </div>

              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Palette size={64} />
              <h3>Visual Engine Ready</h3>
              <p>Enter a topic to generate a beautiful lesson</p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .bg-blue-100 { background-color: #dbeafe; } .text-blue-700 { color: #1d4ed8; }
        .bg-purple-100 { background-color: #f3e8ff; } .text-purple-700 { color: #7e22ce; }
        .bg-orange-100 { background-color: #ffedd5; } .text-orange-700 { color: #c2410c; }
        .bg-amber-100 { background-color: #fef3c7; } .text-amber-700 { color: #b45309; }
        .bg-slate-100 { background-color: #f1f5f9; } .text-slate-700 { color: #334155; }
      `}</style>
    </div>
  );
}