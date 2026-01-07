import React from 'react';
import { Command, ToggleLeft, ToggleRight, Loader, Sparkles, Sliders, Palette, Users, Cpu } from 'lucide-react';

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
                    rows={3}
                />
            </div>

            {/* Content Depth Section */}
            <div className="section-divider"><Sliders size={14} /> <span>Structure</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                    <label>Model</label>
                    <select value={model} onChange={e => setModel(e.target.value)}>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (New Stable)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (High Quality)</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                        <option value="gemini-flash-latest">Gemini Flash Latest</option>
                        <option value="gemini-pro-latest">Gemini Pro Latest</option>
                    </select>
                </div>
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
                    <label>Level</label>
                    <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)}>
                        <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Length</label>
                    <select value={length} onChange={e => setLength(e.target.value)}>
                        <option value="short">Short (5 Qs)</option>
                        <option value="medium">Medium (10 Qs)</option>
                        <option value="long">Long (15 Qs)</option>
                    </select>
                </div>
            </div>

            {/* Audience Section */}
            <div className="section-divider"><Users size={14} /> <span>Audience</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
                <div className="input-group">
                    <label>Target Audience</label>
                    <select value={audience} onChange={e => setAudience(e.target.value)}>
                        <option value="kids">Kids (Playful)</option>
                        <option value="teens">Teens (Relatable)</option>
                        <option value="adults">Adults (Standard)</option>
                        <option value="professionals">Professionals (Formal)</option>
                    </select>
                </div>
                <div
                    className={`toggle-box ${isScaffolded ? 'active' : ''}`}
                    onClick={() => setIsScaffolded(!isScaffolded)}
                    style={{ height: '36px', marginTop: '0' }}
                >
                    {isScaffolded ? <ToggleRight color="black" /> : <ToggleLeft color="#d4d4d8" />}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Scaffolding</span>
                </div>
            </div>

            {/* Aesthetics Section */}
            <div className="section-divider"><Palette size={14} /> <span>Visual Style</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                    <label>Art Style</label>
                    <select value={visualStyle} onChange={e => setVisualStyle(e.target.value)}>
                        <option value="minimal vector line art">Minimal Line Art</option>
                        <option value="clay 3d render style">Clay 3D</option>
                        <option value="watercolor painting style">Watercolor</option>
                        <option value="pixel art style">Pixel Art</option>
                        <option value="cyberpunk digital art">Cyberpunk</option>
                        <option value="childrens book illustration">Storybook</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Mascot (Optional)</label>
                    <input
                        type="text"
                        placeholder="e.g. A blue robot"
                        value={mascotPref}
                        onChange={e => setMascotPref(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e4e4e7' }}
                    />
                </div>
            </div>

            <button
                className="generate-btn"
                onClick={onGenerate}
                disabled={loading}
                style={{
                    marginTop: '20px',
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

            <style>{`
                .section-divider {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
                    color: #a1a1aa; margin-top: 15px; margin-bottom: 8px;
                    border-bottom: 1px solid #f4f4f5; padding-bottom: 4px;
                }
            `}</style>
        </div>
    );
}