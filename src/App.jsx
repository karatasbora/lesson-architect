import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import {
  Layout, Download, Sparkles, Trash2,
  Settings, BookOpen, ToggleLeft, ToggleRight,
  FileText, Palette, Printer, Image as ImageIcon
} from 'lucide-react';

// Helper to convert URL to Base64 for PDF embedding
const getBase64FromUrl = async (url) => {
  const data = await fetch(url);
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result);
  });
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

  // Visual Assets State
  const [mascotUrl, setMascotUrl] = useState(null);
  const [themeColors, setThemeColors] = useState({ primary: '#4f46e5', accent: '#10b981' });

  // Load History
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('lesson_history') || '[]');
    setHistory(saved);
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
    setActivity(item);
    if (item.visuals) {
      setMascotUrl(item.visuals.mascotUrl);
      setThemeColors(item.visuals.themeColors);
    }
    if (item.meta) {
      setCefrLevel(item.meta.level);
      setActivityType(item.meta.type);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all saved lessons?")) {
      setHistory([]);
      localStorage.setItem('lesson_history', '[]');
    }
  };

  // --- AI ENGINE ---
  const generateActivity = async () => {
    if (!apiKey) return alert("Please enter API Key");
    setLoading(true);
    setActivity(null);
    setMascotUrl(null); // Reset image

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
           - Write a "mascot_prompt": A description for an AI image generator to create a cute header illustration (e.g. "Cartoon pig eating pizza in Rome vector art").
        
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

      setActivity(data);
      setThemeColors({ primary: data.visual_theme.primary_color, accent: '#4b5563' });

      // --- GENERATE IMAGE ---
      // We use Pollinations.ai (Free, No Key) with the prompt from Gemini
      const promptEncoded = encodeURIComponent(data.visual_theme.mascot_prompt + " white background, high quality, vector style, flat illustration");
      const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=400&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

      setMascotUrl(imageUrl);
      addToHistory(data, { mascotUrl: imageUrl, themeColors: { primary: data.visual_theme.primary_color } });

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ROBUST MODERN PDF ENGINE ---
  const downloadPDF = async () => {
    if (!activity) return;
    const doc = new jsPDF();

    // 1. GLOBAL CONFIG
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = width - (margin * 2);

    // Theme Colors
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };
    const primaryRGB = hexToRgb(themeColors.primary);
    const slate800 = [30, 41, 59];
    const slate500 = [100, 116, 139];
    const slate50 = [248, 250, 252];
    const slate200 = [226, 232, 240];

    // 2. STATE & HELPERS
    let cursorY = 0;
    let pageNumber = 1;

    const drawFooter = (pNum) => {
      doc.setFontSize(8);
      doc.setTextColor(...slate500);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${pNum}  •  ${activity.title}`, width - margin, height - 10, { align: 'right' });

      // Bottom accent line
      doc.setDrawColor(...primaryRGB);
      doc.setLineWidth(1);
      doc.line(margin, height - 15, width - margin, height - 15);
    };

    const checkSpace = (required) => {
      if (cursorY + required > height - 25) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = 25; // Reset to top

        // Re-draw sidebar on new page
        doc.setFillColor(...primaryRGB);
        doc.rect(0, 0, 6, height, 'F');
      }
    };

    // --- RENDER START ---

    // === PAGE 1: HEADER ===
    // Sidebar Strip
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, 6, height, 'F');

    // Title Block
    cursorY = 25;
    doc.setTextColor(...primaryRGB);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ENGLISH LEARNING SERIES", margin + 10, cursorY);

    cursorY += 12;
    doc.setTextColor(...slate800);
    doc.setFontSize(24);
    // Split title if it's too long
    const titleLines = doc.splitTextToSize(activity.title, contentW - 50);
    doc.text(titleLines, margin + 10, cursorY);
    cursorY += (titleLines.length * 10) + 5;

    // Tags
    const drawTag = (text, x) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const w = doc.getTextWidth(text) + 10;
      doc.setFillColor(...slate200);
      doc.roundedRect(x, cursorY - 6, w, 8, 2, 2, 'F');
      doc.setTextColor(...slate500);
      doc.text(text, x + 5, cursorY - 1);
      return x + w + 5;
    };

    let tagX = margin + 10;
    tagX = drawTag(activity.meta.level, tagX);
    tagX = drawTag(activity.meta.type.toUpperCase(), tagX);
    tagX = drawTag("20 MIN", tagX);

    // Mascot
    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        doc.addImage(base64Img, 'JPEG', width - 50, 15, 35, 35);
      } catch (e) { console.error(e); }
    }

    cursorY += 20;

    // === STUDENT INFO ===
    doc.setDrawColor(...slate200);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, cursorY, width - margin, cursorY);
    cursorY += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate500);
    doc.text("Name: __________________________", aq + 10, cursorY);
    doc.text("Date: __________________________", width / 2, cursorY);
    cursorY += 20;

    // === INSTRUCTIONS BOX ===
    // 1. Set font to calculate accurate height
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const instrLines = doc.splitTextToSize(activity.student_worksheet.instructions, contentW - 25);
    const instrH = (instrLines.length * 6) + 20;

    checkSpace(instrH);

    // Background
    doc.setFillColor(...slate50);
    doc.setDrawColor(...primaryRGB);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin + 10, cursorY, contentW - 10, instrH, 3, 3, 'FD');

    // Label
    doc.setTextColor(...primaryRGB);
    doc.setFont("helvetica", "bold");
    doc.text("INSTRUCTIONS", margin + 20, cursorY + 10);

    // Text Body
    doc.setTextColor(...slate800);
    doc.setFont("helvetica", "normal");
    doc.text(instrLines, margin + 20, cursorY + 18);

    cursorY += instrH + 15;

    // === QUESTIONS LOOP ===
    activity.student_worksheet.questions.forEach((q, i) => {
      // 1. PRE-CALCULATE HEIGHT
      // Important: Use the same fontSize (11) as the render step!
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const qTextLines = doc.splitTextToSize(q.question_text, contentW - 40);

      let cardH = 20; // Padding top/bottom
      cardH += qTextLines.length * 6; // Question text height

      // Add Options Height
      let hasOptions = false;
      let isHorizontalOpt = false;

      if (q.options && q.options.length > 0) {
        hasOptions = true;
        const totalOptLen = q.options.join('').length;
        isHorizontalOpt = totalOptLen < 60; // Heuristic for horiz layout

        cardH += isHorizontalOpt ? 12 : (q.options.length * 8) + 5;
      } else if (activityType === 'true_false') {
        cardH += 12;
      } else {
        cardH += 18; // Writing lines
      }

      // Add Hint Height
      if (q.hint && isScaffolded) cardH += 15;

      // 2. CHECK PAGE BREAK
      checkSpace(cardH + 5);

      // 3. DRAW CARD
      doc.setDrawColor(...slate200);
      doc.setLineWidth(0.3);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin + 10, cursorY, contentW - 10, cardH, 2, 2, 'FD');

      // Question Number Badge (Simple Box)
      doc.setFillColor(...primaryRGB);
      doc.roundedRect(margin + 10, cursorY + 5, 8, 8, 1, 1, 'F');
      doc.setTextColor(255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text((i + 1).toString(), margin + 14, cursorY + 10, { align: 'center', baseline: 'middle' });

      // Question Text
      doc.setTextColor(...slate800);
      doc.setFontSize(11);
      // Ensure we use the exact lines calculated earlier
      doc.text(qTextLines, margin + 25, cursorY + 10);

      let localY = cursorY + 12 + (qTextLines.length * 6);

      // Options Render
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...slate500);

      if (hasOptions) {
        if (isHorizontalOpt) {
          let optX = margin + 25;
          q.options.forEach(opt => {
            // Circle Icon
            doc.setDrawColor(...slate500);
            doc.circle(optX + 2, localY - 1, 2);
            doc.text(opt, optX + 7, localY);
            optX += doc.getTextWidth(opt) + 20;
          });
        } else {
          q.options.forEach(opt => {
            doc.setDrawColor(...slate500);
            doc.circle(margin + 27, localY - 1, 2);
            doc.text(opt, margin + 35, localY);
            localY += 8;
          });
        }
      } else if (activityType === 'true_false') {
        doc.text("TRUE       FALSE", margin + 25, localY);
      } else {
        // Writing Lines
        doc.setDrawColor(...slate200);
        doc.line(margin + 25, localY + 5, width - margin - 15, localY + 5);
      }

      // Integrated Hint
      if (q.hint && isScaffolded) {
        // Draw bottom bar inside card
        const hintY = cursorY + cardH - 10;
        doc.setFillColor(255, 251, 235); // Amber-50
        doc.rect(margin + 11, hintY - 4, contentW - 12, 13, 'F');

        doc.setFontSize(9);
        doc.setTextColor(180, 83, 9); // Amber-700
        doc.setFont("helvetica", "bold");
        doc.text("HINT:", margin + 20, hintY + 3);

        doc.setFont("helvetica", "italic");
        doc.text(q.hint, margin + 32, hintY + 3);
      }

      cursorY += cardH + 10;
    });

    drawFooter(pageNumber);

    // === TEACHER PAGE ===
    doc.addPage();
    pageNumber++;
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, 6, height, 'F'); // Sidebar

    cursorY = 30;
    doc.setTextColor(...slate800);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("TEACHER'S COMPANION", margin + 15, cursorY);

    cursorY += 20;
    doc.setFontSize(10);
    doc.setTextColor(...slate500);
    doc.text("RATIONALE & FOCUS", margin + 15, cursorY);

    cursorY += 8;
    doc.setTextColor(...slate800);
    doc.setFont("helvetica", "normal");
    const ratLines = doc.splitTextToSize(activity.teacher_guide.rationale, contentW - 20);
    doc.text(ratLines, margin + 15, cursorY);

    cursorY += (ratLines.length * 6) + 20;

    // Answer Key
    doc.setFillColor(...slate50);
    doc.roundedRect(margin + 15, cursorY, contentW - 20, 10, 2, 2, 'F');
    doc.setTextColor(...primaryRGB);
    doc.setFont("helvetica", "bold");
    doc.text("ANSWER KEY", margin + 20, cursorY + 7);

    cursorY += 20;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate800);

    if (activity.teacher_guide.key_answers) {
      activity.teacher_guide.key_answers.forEach((ans, i) => {
        doc.text(`${i + 1}. ${ans}`, margin + 20, cursorY);
        cursorY += 8;
      });
    }

    drawFooter(pageNumber);
    doc.save(`${activity.title.replace(/\s+/g, '_')}_Lesson.pdf`);
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
                {item.visuals?.mascotUrl && <img src={item.visuals.mascotUrl} style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' }} />}
                <div>
                  <span className="history-title">{item.title}</span>
                  <div className="history-meta">{item.meta?.level}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={clearHistory} style={{ marginTop: 'auto', background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' }}><Trash2 size={14} /> Clear History</button>
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

        <div className="preview-panel" style={{ background: '#f0f9ff' }}>
          {activity ? (
            <div className="paper">
              {/* VISUAL HEADER PREVIEW */}
              <div style={{
                background: themeColors.primary,
                padding: '20px', borderRadius: '8px 8px 0 0',
                color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{activity.title}</h1>
                  <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{activity.meta.level} • {activity.meta.type.toUpperCase()}</div>
                </div>
                {mascotUrl && (
                  <img src={mascotUrl} alt="Mascot" style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px solid white', objectFit: 'cover' }} />
                )}
              </div>

              <div style={{ padding: '30px' }}>
                <button onClick={downloadPDF} className="download-btn" style={{ width: '100%', marginBottom: '20px', background: '#1f2937' }}>
                  <Printer size={18} /> Download Illustrated PDF
                </button>

                <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${themeColors.primary}` }}>
                  <strong>Instructions:</strong> {activity.student_worksheet.instructions}
                </div>

                <div style={{ marginTop: '30px' }}>
                  {activity.student_worksheet.questions.map((q, i) => (
                    <div key={i} style={{ marginBottom: '15px', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
                      <div style={{ fontWeight: 'bold', color: themeColors.primary }}>{i + 1}. {q.question_text}</div>
                      {q.options && q.options.map(opt => <div key={opt} style={{ marginLeft: '10px', fontSize: '0.9rem' }}>○ {opt}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '100px' }}>
              <Palette size={64} />
              <h3>Visual Engine Ready</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}