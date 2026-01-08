import React from 'react';
import { Palette, Download, HelpCircle, MapPin, User, Utensils, Clock, AlertTriangle } from 'lucide-react';

// "SmartTags" Logic
const getCategoryBadge = (text) => {
    if (!text) return { label: "detail", icon: <HelpCircle size={10} />, class: "badge-detail" };
    const lower = text.toLowerCase();
    if (lower.includes('where') || lower.includes('place')) return { label: "location", icon: <MapPin size={10} />, class: "badge-zinc" };
    if (lower.includes('who')) return { label: "character", icon: <User size={10} />, class: "badge-zinc" };
    if (lower.includes('what') && (lower.includes('eat') || lower.includes('food'))) return { label: "food", icon: <Utensils size={10} />, class: "badge-zinc" };
    if (lower.includes('when') || lower.includes('time')) return { label: "time", icon: <Clock size={10} />, class: "badge-zinc" };
    return { label: "detail", icon: <HelpCircle size={10} />, class: "badge-detail" };
};

export default function LessonPreview({ activity, mascotUrl, isScaffolded, onDownload }) {
    if (!activity) {
        return (
            <div className="preview-panel">
                <div className="flex-column-center" style={{ height: '100%', opacity: 0.6, color: 'var(--zinc-400)' }}>
                    <div className="flex-column-center shadow-soft" style={{
                        background: 'white', padding: '30px', borderRadius: '50%',
                        marginBottom: '20px', boxShadow: 'var(--shadow-md)'
                    }}>
                        <Palette size={48} strokeWidth={1} color="var(--zinc-900)" />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--zinc-900)', marginBottom: '8px', fontWeight: 600 }}>Start Your Blueprint</h3>
                    <p style={{ maxWidth: '300px', textAlign: 'center', fontSize: '0.9rem' }}>
                        Configure the lesson parameters and click Generate to construct a new lesson plan.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="preview-panel">
            <div className="paper">
                {/* HEADER */}
                <div style={{ marginBottom: '40px', borderBottom: '1px solid #e4e4e7', paddingBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.03em' }}>{activity.title}</h1>

                                <button onClick={onDownload} className="download-btn" style={{
                                    background: 'transparent',
                                    border: '1px solid #e4e4e7',
                                    color: '#09090b',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 500
                                }} title="Export as PDF">
                                    <Download size={14} /> <span>PDF</span>
                                </button>
                            </div>

                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', color: '#71717a', fontSize: '0.8rem', fontWeight: 600 }}>
                                <span style={{ border: '1px solid #e4e4e7', padding: '2px 8px', borderRadius: '4px' }}>{activity.meta?.level}</span>
                                <span style={{ border: '1px solid #e4e4e7', padding: '2px 8px', borderRadius: '4px' }}>{activity.meta?.type?.toUpperCase()}</span>
                            </div>
                        </div>
                        {mascotUrl && (
                            <img src={mascotUrl} alt="Lesson Mascot" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', filter: 'grayscale(100%)' }} />
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

            </div>
        </div>

    );
}