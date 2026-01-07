import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Sidebar from './components/Sidebar';
import ConfigPanel from './components/ConfigPanel';
import LessonPreview from './components/LessonPreview';
import { generatePDF } from './utils/pdfGenerator';

export default function App() {
  // --- STATE ---
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('gemini_key') || ''; }
    catch (e) { return ''; }
  });

  const [transcript, setTranscript] = useState('');
  const [activityType, setActivityType] = useState('comprehension');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [isScaffolded, setIsScaffolded] = useState(false);
  const [length, setLength] = useState('medium');
  const [audience, setAudience] = useState('adults');
  const [visualStyle, setVisualStyle] = useState('minimal vector line art');
  const [mascotPref, setMascotPref] = useState('');
  const [model, setModel] = useState('gemini-flash-latest');
  const [loading, setLoading] = useState(false);

  // Data State
  const [activity, setActivity] = useState(null);
  const [history, setHistory] = useState([]);
  const [mascotUrl, setMascotUrl] = useState(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lesson_history') || '[]');
      if (Array.isArray(saved)) setHistory(saved);
    } catch (e) {
      localStorage.setItem('lesson_history', '[]');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_key', apiKey);
  }, [apiKey]);

  // --- HISTORY ACTIONS ---
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
    if (!item || !item.student_worksheet) return alert("Invalid saved lesson.");
    setActivity(item);
    if (item.visuals) setMascotUrl(item.visuals.mascotUrl);
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

  // --- GENERATION LOGIC ---
  const handleGenerate = async () => {
    if (!apiKey) return alert("Please enter API Key");
    setLoading(true);
    setActivity(null);
    setMascotUrl(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model: model });

      let count = 10;
      if (length === 'short') count = 5;
      if (length === 'long') count = 15;

      let typePrompt = "";
      switch (activityType) {
        case 'vocabulary': typePrompt = `FOCUS: VOCABULARY. Extract ${count} difficult words. Create matching questions.`; break;
        case 'grammar': typePrompt = "FOCUS: GRAMMAR. Identify tense/structures. Create fill-in-the-blanks."; break;
        case 'true_false': typePrompt = `FOCUS: TRUE/FALSE. Create ${count} statements.`; break;
        case 'discussion': typePrompt = "FOCUS: SPEAKING. Create discussion prompts."; break;
        default: typePrompt = "FOCUS: COMPREHENSION. Standard open questions.";
      }

      const scaffoldPrompt = isScaffolded ? "SCAFFOLDING: ON. Hints, Multiple Choice." : "SCAFFOLDING: OFF.";

      const prompt = `
        You are "arc", an advanced Lesson Architect AI.
        TEXT: "${transcript}"
        CONFIG: ${typePrompt} | Level: ${cefrLevel} | Audience: ${audience} | ${scaffoldPrompt}
        
        TASK:
        1. Create content tailored for ${audience}.
        2. DESIGN A VISUAL THEME (primary_color, mascot_prompt).
        
        OUTPUT JSON ONLY:
        {
          "title": "Title",
          "meta": { "level": "${cefrLevel}", "type": "${activityType}", "duration": "20m" },
          "visual_theme": { "primary_color": "#hex", "mascot_prompt": "desc" },
          "student_worksheet": {
            "instructions": "...",
            "questions": [{ "question_text": "...", "options": ["A","B"], "hint": "..." }],
            "glossary": [{ "word": "...", "definition": "..." }]
          }
        }
      `;

      const result = await genModel.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);

      if (!data.student_worksheet) throw new Error("Invalid AI response");

      setActivity(data);

      const mascotBase = mascotPref || (data.visual_theme?.mascot_prompt || "abstract concept");
      const promptEncoded = encodeURIComponent(mascotBase + " " + visualStyle + ", white background");
      const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=400&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
      setMascotUrl(imageUrl);

      addToHistory(data, { mascotUrl: imageUrl, themeColors: { primary: '#09090b' } });

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        apiKey={apiKey}
        setApiKey={setApiKey}
        history={history}
        loadFromHistory={loadFromHistory}
        clearHistory={clearHistory}
      />

      <main className="workspace">
        <ConfigPanel
          transcript={transcript} setTranscript={setTranscript}
          activityType={activityType} setActivityType={setActivityType}
          cefrLevel={cefrLevel} setCefrLevel={setCefrLevel}
          isScaffolded={isScaffolded} setIsScaffolded={setIsScaffolded}
          length={length} setLength={setLength}
          audience={audience} setAudience={setAudience}
          visualStyle={visualStyle} setVisualStyle={setVisualStyle}
          mascotPref={mascotPref} setMascotPref={setMascotPref}
          model={model} setModel={setModel}
          loading={loading} onGenerate={handleGenerate}
        />

        <LessonPreview
          activity={activity}
          mascotUrl={mascotUrl}
          isScaffolded={isScaffolded}
          onDownload={() => generatePDF(activity, mascotUrl, isScaffolded)}
        />
      </main>

    </div>
  );
}