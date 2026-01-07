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

  // --- FINAL POLISH: SIDEBAR GLOSSARY & VISUAL CUES ---
  const downloadPDF = async () => {
    if (!activity) return;
    const doc = new jsPDF();

    // 1. GRID SYSTEM
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Layout: Main Content (65%) | Gutter (5%) | Sidebar (30%)
    const sidebarW = (width - (margin * 2)) * 0.30;
    const mainW = (width - (margin * 2)) * 0.65;
    const gutter = (width - (margin * 2)) * 0.05;
    const sidebarX = margin + mainW + gutter;

    // Theme Colors
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };
    const primaryRGB = hexToRgb(themeColors.primary);
    const slate800 = [30, 41, 59];
    const slate500 = [100, 116, 139];
    const slate100 = [241, 245, 249];

    // 2. HELPERS
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
      // Gray background for sidebar area
      doc.setFillColor(250, 250, 250);
      doc.rect(sidebarX - gutter / 2, 0, sidebarW + margin + gutter / 2, height, 'F');

      // Sidebar Header: Glossary
      let sideY = 60; // Start below main header

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
          // Word
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(item.word, sidebarX, sideY);

          // Definition
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const defLines = doc.splitTextToSize(item.definition, sidebarW);
          doc.text(defLines, sidebarX, sideY + 4);

          sideY += (defLines.length * 4) + 8;
        });
      }

      // Visual Tips Box
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
      const tipText = "Look for keywords in the question. Read the story twice: once for the main idea, once for details.";
      doc.text(doc.splitTextToSize(tipText, sidebarW - 10), sidebarX + 5, sideY + 15);
    };

    const checkSpace = (required) => {
      if (cursorY + required > height - 20) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = 20;
        drawSidebar(); // Re-draw sidebar background on new page
      }
    };

    // Keyword Detector for "Visual Cues"
    const getCategoryBadge = (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('where') || lower.includes('place') || lower.includes('go')) return "LOCATION";
      if (lower.includes('who')) return "CHARACTER";
      if (lower.includes('what') && (lower.includes('eat') || lower.includes('food'))) return "FOOD";
      if (lower.includes('when') || lower.includes('time')) return "TIME";
      if (lower.includes('why')) return "REASON";
      return "DETAIL";
    };

    // --- RENDER START ---

    // Initial Page Setup
    drawSidebar();

    // === HEADER (Full Width) ===
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, width, 40, 'F');

    // Title
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(activity.title, margin, 18);

    // Meta
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${activity.meta.level} LEVEL  •  ${activity.meta.type.toUpperCase()}`, margin, 28);

    // Mascot (Top Right Overlay)
    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        doc.setDrawColor(255);
        doc.setLineWidth(2);
        doc.circle(width - 30, 20, 16, 'S'); // White ring
        doc.addImage(base64Img, 'JPEG', width - 42, 8, 24, 24);
      } catch (e) { console.error(e); }
    }

    cursorY = 55;

    // === STUDENT INFO ===
    doc.setTextColor(...slate500);
    doc.setFontSize(9);
    doc.text("Name: ______________________", margin, cursorY);
    doc.text("Date: ______________________", margin + mainW / 2, cursorY);

    cursorY += 15;

    // === INSTRUCTIONS ===
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

    // === QUESTIONS LOOP ===
    activity.student_worksheet.questions.forEach((q, i) => {
      // Calc Height
      doc.setFontSize(11);
      const qLines = doc.splitTextToSize(q.question_text, mainW - 20);
      let boxH = (qLines.length * 6) + 15; // Base

      if (q.options) boxH += (q.options.length * 8) + 5;
      else if (activityType === 'true_false') boxH += 10;
      else boxH += 15;

      if (q.hint && isScaffolded) boxH += 12;

      checkSpace(boxH + 5);

      // Question Card
      doc.setDrawColor(...slate500);
      doc.setLineWidth(0.1);
      // doc.rect(margin, cursorY, mainW, boxH); // Debug border? No, keep it clean.

      // 1. Category Badge (Visual Cue)
      const cat = getCategoryBadge(q.question_text);
      doc.setFillColor(...primaryRGB);
      doc.roundedRect(margin, cursorY, doc.getTextWidth(cat) + 6, 6, 1, 1, 'F');
      doc.setTextColor(255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(cat, margin + 3, cursorY + 4);

      // 2. Question Text
      doc.setTextColor(...slate800);
      doc.setFontSize(11);
      doc.text(qLines, margin, cursorY + 12);

      let localY = cursorY + 12 + (qLines.length * 5);

      // 3. Inputs (Checkboxes)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      if (q.options) {
        q.options.forEach(opt => {
          // Square Checkbox
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

      // 4. Scaffolded Hint
      if (q.hint && isScaffolded) {
        doc.setFillColor(254, 243, 199); // Amber-100
        doc.roundedRect(margin, localY, mainW, 8, 1, 1, 'F');
        doc.setTextColor(180, 83, 9); // Amber-700
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`HINT: ${q.hint}`, margin + 5, localY + 5.5);
        localY += 10;
      }

      cursorY = localY + 8; // Spacer
    });

    drawFooter(pageNumber);

    // === TEACHER PAGE (Full Width) ===
    doc.addPage();
    pageNumber++;
    doc.setFillColor(30);
    doc.rect(0, 0, width, height, 'F'); // Dark background mode? No, standard.

    // Header
    doc.setFillColor(...slate800);
    doc.rect(0, 0, width, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TEACHER'S COMPANION", margin, 25);

    cursorY = 55;

    // Content
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Pedagogical Focus", margin, cursorY);
    cursorY += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const ratLines = doc.splitTextToSize(activity.teacher_guide.rationale, width - (margin * 2));
    doc.text(ratLines, margin, cursorY);

    cursorY += (ratLines.length * 5) + 20;

    // Keys
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