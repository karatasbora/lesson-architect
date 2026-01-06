import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import { BookOpen, Download, Cpu, AlertCircle, FileText, CheckCircle } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');

  // --- THE AI ENGINE ---
  const generateActivity = async () => {
    if (!apiKey) {
      setError("Please enter a Google Gemini API Key first.");
      return;
    }
    setLoading(true);
    setError('');
    setActivity(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are a Master TEFL Lesson Designer.
        Analyze this text: "${transcript}"
        
        TASK: Create a distinct "Reading Comprehension" activity for B1/B2 Level students.
        
        STRICT OUTPUT FORMAT:
        You must return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
        
        JSON STRUCTURE:
        {
          "title": "Creative Title Here",
          "level": "CEFR Level",
          "duration": "Time (e.g. 20 mins)",
          "teacher_guide": {
            "rationale": "Why this text is useful...",
            "potential_problems": "One grammar point students might struggle with..."
          },
          "student_worksheet": {
            "instructions": "Clear, simple instructions for the student.",
            "questions": [
              "Question 1?",
              "Question 2?",
              "Question 3?",
              "Question 4?"
            ],
            "glossary": [
              {"word": "Word1", "definition": "Simple definition"},
              {"word": "Word2", "definition": "Simple definition"},
              {"word": "Word3", "definition": "Simple definition"}
            ]
          }
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      // Clean the output to ensure it is pure JSON
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      setActivity(JSON.parse(text));
    } catch (err) {
      console.error(err);
      setError("Error: " + (err.message || "Failed to parse AI response. Try again."));
    } finally {
      setLoading(false);
    }
  };

  // --- THE PDF ENGINE ---
  const downloadPDF = () => {
    if (!activity) return;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 98, 255); // Blue
    doc.text(activity.title, margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Level: ${activity.level} | Duration: ${activity.duration}`, margin, y);
    y += 20;

    // Line
    doc.setLineWidth(0.5);
    doc.line(margin, y - 10, 190, y - 10);

    // Student Section
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.text("Student Worksheet", margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Instructions:", margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(activity.student_worksheet.instructions, margin + 30, y);
    y += 15;

    activity.student_worksheet.questions.forEach((q, i) => {
      doc.text(`${i + 1}. ${q}`, margin, y);
      y += 10;
    });

    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text("Vocabulary:", margin, y);
    y += 8;
    doc.setFont(undefined, 'normal');

    activity.student_worksheet.glossary.forEach((g) => {
      doc.text(`• ${g.word}: ${g.definition}`, margin, y);
      y += 7;
    });

    doc.save("lesson_plan.pdf");
  };

  // --- THE UI ---
  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Cpu size={28} />
          <h1>LessonArchitect AI</h1>
        </div>
        <div className="status-badge">v1.0 Beta</div>
      </header>

      <main className="main-content">
        {/* CONFIG CARD */}
        <div className="card config-card">
          <div className="input-group">
            <label>Google Gemini API Key</label>
            <input
              type="password"
              placeholder="Paste key (starts with AIza...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <small>Your key is stored locally in your browser.</small>
          </div>

          <div className="input-group">
            <label>Material Transcript</label>
            <textarea
              placeholder="Paste the article, story, or script here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            ></textarea>
          </div>

          <button
            className="generate-btn"
            onClick={generateActivity}
            disabled={loading || !transcript}
          >
            {loading ? (
              <span className="loading-text">Building Lesson...</span>
            ) : (
              <>
                <Cpu size={18} /> Generate Activity
              </>
            )}
          </button>

          {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
        </div>

        {/* RESULTS CARD */}
        {activity && (
          <div className="card result-card">
            <div className="result-header">
              <div>
                <h2>{activity.title}</h2>
                <div className="meta-tags">
                  <span>{activity.level}</span>
                  <span>{activity.duration}</span>
                </div>
              </div>
              <button onClick={downloadPDF} className="download-btn">
                <Download size={18} /> PDF
              </button>
            </div>

            <div className="teacher-section">
              <h3><CheckCircle size={16} /> Teacher Notes</h3>
              <p>{activity.teacher_guide.rationale}</p>
              <p><strong>Watch out for:</strong> {activity.teacher_guide.potential_problems}</p>
            </div>

            <div className="student-section">
              <h3><FileText size={16} /> Student Worksheet</h3>
              <p className="instructions"><em>{activity.student_worksheet.instructions}</em></p>

              <ul className="question-list">
                {activity.student_worksheet.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>

              <div className="glossary-box">
                <h4>Key Vocabulary</h4>
                {activity.student_worksheet.glossary.map((g, i) => (
                  <div key={i} className="glossary-item">
                    <strong>{g.word}</strong>: {g.definition}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}