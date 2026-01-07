import React from 'react';
import { Trash2 } from 'lucide-react';

export default function Sidebar({ apiKey, setApiKey, history, loadFromHistory, clearHistory }) {
    // Determine the base URL for assets (handles the 'base: /arc/' config)
    const baseUrl = import.meta.env.BASE_URL;

    return (
        <aside className="sidebar">
            <div className="brand">
                <img
                    src={`${baseUrl}arc.svg`}
                    alt="arc"
                    style={{ width: '32px', height: '32px' }}
                />
                <span style={{ fontSize: '1.5rem', letterSpacing: '-0.04em', fontWeight: 600 }}>arc</span>
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
                <label>API Key</label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    style={{ fontFamily: 'monospace' }}
                />
            </div>

            {/* History List */}
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
    );
}