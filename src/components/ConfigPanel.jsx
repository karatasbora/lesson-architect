import React from 'react';
import { Command, ToggleLeft, ToggleRight, Loader, Sparkles, Sliders, Palette, Users, FileText } from 'lucide-react';

export default function ConfigPanel({
    transcript, setTranscript,
    activityType, setActivityType,
    cefrLevel, setCefrLevel,
    isScaffolded, setIsScaffolded,
    length, setLength,
    audience, setAudience,
    visualStyle, setVisualStyle,
    mascotPref, setMascotPref,
    model, setModel,
    loading, onGenerate
}) {
    return (
        <div className="editor-panel">
            <div className="panel-header">
                <div style={{ background: 'white', padding: '8px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <Command size={20} className="text-zinc-900" />
                </div>
                <div>
                    <h2 className="panel-title">Configuration</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--cf-text-muted)' }}>Customize your lesson parameters</p>
                </div>
            </div>

            {/* Source Material */}
            <div className="config-section">
                <div className="input-wrapper">
                    <label className="input-label">Source Material / Topic</label>
                    <textarea
                        className="input-field"
                        placeholder="Paste text or describe a topic (e.g., 'The history of the internet' or 'Quantum Physics for kids')..."
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                        rows={3}
                    />
                </div>
            </div>

            {/* Structure Settings */}
            <div className="config-section">
                <div className="section-title"><Sliders size={14} /> <span>Structure</span></div>

                <div className="grid-2">
                    <div className="input-wrapper">
                        <label className="input-label">Model</label>
                        <select className="input-field" value={model} onChange={e => setModel(e.target.value)}>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <option value="gemini-flash-latest">Gemini Flash</option>
                        </select>
                    </div>
                    <div className="input-wrapper">
                        <label className="input-label">Focus</label>
                        <select className="input-field" value={activityType} onChange={e => setActivityType(e.target.value)}>
                            <option value="comprehension">Comprehension</option>
                            <option value="vocabulary">Vocabulary</option>
                            <option value="grammar">Grammar</option>
                            <option value="discussion">Discussion</option>
                        </select>
                    </div>
                </div>

                <div className="grid-2">
                    <div className="input-wrapper">
                        <label className="input-label">Level (CEFR)</label>
                        <select className="input-field" value={cefrLevel} onChange={e => setCefrLevel(e.target.value)}>
                            <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option>
                        </select>
                    </div>
                    <div className="input-wrapper">
                        <label className="input-label">Length</label>
                        <select className="input-field" value={length} onChange={e => setLength(e.target.value)}>
                            <option value="short">Short (5 Qs)</option>
                            <option value="medium">Medium (10 Qs)</option>
                            <option value="long">Long (15 Qs)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Audience Settings */}
            <div className="config-section">
                <div className="section-title"><Users size={14} /> <span>Audience</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', alignItems: 'end' }}>
                    <div className="input-wrapper">
                        <label className="input-label">Target Group</label>
                        <select className="input-field" value={audience} onChange={e => setAudience(e.target.value)}>
                            <option value="kids">Kids (Playful)</option>
                            <option value="teens">Teens (Relatable)</option>
                            <option value="adults">Adults (Standard)</option>
                            <option value="professionals">Professionals (Formal)</option>
                        </select>
                    </div>

                    <div
                        className={`toggle-card ${isScaffolded ? 'active' : ''}`}
                        onClick={() => setIsScaffolded(!isScaffolded)}
                    >
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Scaffolding</span>
                        {isScaffolded ? <ToggleRight size={20} className="text-indigo-500" style={{ color: 'var(--accent)' }} /> : <ToggleLeft size={20} color="#d4d4d8" />}
                    </div>
                </div>
            </div>

            {/* Visual Style Settings */}
            <div className="config-section">
                <div className="section-title"><Palette size={14} /> <span>Visual Design</span></div>
                <div className="grid-2">
                    <div className="input-wrapper">
                        <label className="input-label">Art Style</label>
                        <select className="input-field" value={visualStyle} onChange={e => setVisualStyle(e.target.value)}>
                            <option value="minimal vector line art">Minimal Line Art</option>
                            <option value="clay 3d render style">Clay 3D</option>
                            <option value="watercolor painting style">Watercolor</option>
                            <option value="pixel art style">Pixel Art</option>
                            <option value="cyberpunk digital art">Cyberpunk</option>
                            <option value="childrens book illustration">Storybook</option>
                        </select>
                    </div>
                    <div className="input-wrapper">
                        <label className="input-label">Mascot Focus</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Robot"
                            value={mascotPref}
                            onChange={e => setMascotPref(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <button
                    className="btn-primary"
                    onClick={onGenerate}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader size={18} className="animate-spin" />
                            <span>Architecting...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            <span>Generate Lesson</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
