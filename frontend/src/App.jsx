import { useState, useEffect, useCallback } from 'react';
import './App.css';

// ─── HARDCODED API URL ───
const API_URL = 'https://clinical-ner-api.onrender.com';

// ─── Color Palette ───
const ENTITY_STYLES = {
  "DISEASE": { color: "#dc2626", bg: "#fee2e2", label: "Disease" },
  "CHEMICAL": { color: "#2563eb", bg: "#dbeafe", label: "Chemical" },
  "DRUG": { color: "#7c3aed", bg: "#ede9fe", label: "Drug" },
  "SYMPTOM": { color: "#ea580c", bg: "#ffedd5", label: "Symptom" },
  "ANATOMY": { color: "#059669", bg: "#d1fae5", label: "Anatomy" },
  "PROCEDURE": { color: "#d97706", bg: "#fef3c7", label: "Procedure" },
  "PERSON": { color: "#0891b2", bg: "#cffafe", label: "Person" },
  "ORGANIZATION": { color: "#4f46e5", bg: "#e0e7ff", label: "Organization" },
  "TEMPORAL": { color: "#be185d", bg: "#fce7f3", label: "Temporal" },
  "default": { color: "#475569", bg: "#f1f5f9", label: "Other" }
};

// ─── Icons ───
const Icons = {
  Upload: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Play: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  )
};

function App() {
  const [activeTab, setActiveTab] = useState('text');
  const [text, setText] = useState(
    "Patient John Doe was diagnosed with Type 2 Diabetes Mellitus and prescribed Metformin 500mg twice daily. Scheduled for coronary angiography next Tuesday with Dr. Sarah Smith."
  );
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [entities, setEntities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [threshold, setThreshold] = useState(0.0);
  const [hiddenTypes, setHiddenTypes] = useState(new Set());
  const [hoveredEntity, setHoveredEntity] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.ok ? setBackendStatus('connected') : setBackendStatus('error'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const handleExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setEntities(data.entities || []);
      setStats(data.stats || {total: 0, by_type: {}});
    } catch (err) {
      alert('Backend failed. Try Demo Mode instead!');
    }
    setLoading(false);
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/demo`);
      const data = await res.json();
      setText(data.text);
      setEntities(data.entities || []);
      setStats(data.stats || {total: 0, by_type: {}});
    } catch (err) {
      // Ultimate fallback: load demo data directly in frontend
      loadLocalDemo();
    }
    setLoading(false);
  };

  const loadLocalDemo = () => {
    const demoText = `Patient John Doe, 58-year-old male, was admitted on June 15, 2024, with complaints of severe chest pain radiating to the left arm. 
He has a history of Type 2 Diabetes Mellitus, Hypertension, and Hyperlipidemia. 
Current medications include Metformin 1000mg twice daily, Lisinopril 10mg daily, Atorvastatin 40mg daily, and Aspirin 81mg daily.
Physical examination revealed elevated blood pressure at 160/95 mmHg. 
ECG showed ST-segment elevation in leads V1-V4. 
Troponin levels were elevated at 2.4 ng/mL. 
Patient was diagnosed with Acute Myocardial Infarction and scheduled for emergency Percutaneous Coronary Intervention (PCI).
Dr. Sarah Smith, the attending cardiologist, performed the procedure. 
Post-operative care included administration of Heparin infusion and Clopidogrel 75mg daily.
Follow-up appointment scheduled for July 2, 2024 with Dr. Michael Johnson.`;

    const demoEntities = [
      {"text": "John Doe", "label": "PERSON", "start": 8, "end": 16, "score": 0.98},
      {"text": "chest pain", "label": "SYMPTOM", "start": 81, "end": 91, "score": 0.96},
      {"text": "left arm", "label": "ANATOMY", "start": 111, "end": 119, "score": 0.92},
      {"text": "Type 2 Diabetes Mellitus", "label": "DISEASE", "start": 147, "end": 171, "score": 0.97},
      {"text": "Hypertension", "label": "DISEASE", "start": 173, "end": 185, "score": 0.95},
      {"text": "Hyperlipidemia", "label": "DISEASE", "start": 191, "end": 205, "score": 0.94},
      {"text": "Metformin", "label": "DRUG", "start": 232, "end": 241, "score": 0.98},
      {"text": "1000mg", "label": "CHEMICAL", "start": 242, "end": 248, "score": 0.89},
      {"text": "Lisinopril", "label": "DRUG", "start": 266, "end": 276, "score": 0.97},
      {"text": "Atorvastatin", "label": "DRUG", "start": 291, "end": 303, "score": 0.97},
      {"text": "Aspirin", "label": "DRUG", "start": 318, "end": 325, "score": 0.96},
      {"text": "blood pressure", "label": "ANATOMY", "start": 377, "end": 391, "score": 0.91},
      {"text": "Acute Myocardial Infarction", "label": "DISEASE", "start": 520, "end": 547, "score": 0.98},
      {"text": "Percutaneous Coronary Intervention", "label": "PROCEDURE", "start": 572, "end": 606, "score": 0.96},
      {"text": "Sarah Smith", "label": "PERSON", "start": 632, "end": 643, "score": 0.97},
      {"text": "Heparin", "label": "DRUG", "start": 724, "end": 731, "score": 0.96},
      {"text": "Clopidogrel", "label": "DRUG", "start": 747, "end": 758, "score": 0.97},
      {"text": "July 2, 2024", "label": "TEMPORAL", "start": 800, "end": 812, "score": 0.92},
      {"text": "Michael Johnson", "label": "PERSON", "start": 818, "end": 833, "score": 0.96},
    ];

    const stats = {"total": demoEntities.length, "by_type": {}};
    for (const e of demoEntities) {
      stats["by_type"][e.label] = (stats["by_type"][e.label] || 0) + 1;
    }

    setText(demoText);
    setEntities(demoEntities);
    setStats(stats);
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setText(data.text);
      setEntities(data.entities || []);
      setStats(data.stats || {total: 0, by_type: {}});
      setActiveTab('text');
    } catch (err) {
      alert('Upload failed. Try Demo Mode instead!');
    }
    setLoading(false);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const toggleType = (type) => {
    const next = new Set(hiddenTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setHiddenTypes(next);
  };

  const exportJSON = () => {
    const payload = { text, entities, stats, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-ner-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['Entity', 'Type', 'Start', 'End', 'Confidence'];
    const rows = filteredEntities.map(e => 
      [JSON.stringify(e.text), e.label, e.start, e.end, e.score].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-ner-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setEntities([]);
    setStats(null);
    setFile(null);
    setHiddenTypes(new Set());
    setThreshold(0);
  };

  const filteredEntities = entities.filter(e => 
    e.score >= threshold && !hiddenTypes.has(e.label)
  );

  const uniqueTypes = [...new Set(entities.map(e => e.label))];

  const getStyle = (label) => ENTITY_STYLES[label] || ENTITY_STYLES.default;

  const renderHighlightedText = () => {
    if (!filteredEntities.length) return <p style={{lineHeight: 1.8, color: '#475569', fontSize: '15px'}}>{text}</p>;
    
    let parts = [];
    let lastIndex = 0;
    const sorted = [...filteredEntities].sort((a, b) => a.start - b.start);

    sorted.forEach((ent, i) => {
      if (ent.start > lastIndex) {
        parts.push(<span key={`g-${i}`}>{text.slice(lastIndex, ent.start)}</span>);
      }
      const style = getStyle(ent.label);
      parts.push(
        <mark
          key={`e-${i}`}
          onMouseEnter={() => setHoveredEntity(ent)}
          onMouseLeave={() => setHoveredEntity(null)}
          title={`${style.label} — Confidence: ${ent.score}`}
          style={{
            background: style.bg,
            color: style.color,
            padding: '2px 6px',
            borderRadius: '6px',
            fontWeight: 700,
            cursor: 'pointer',
            border: `1.5px solid ${style.color}`,
            transition: 'all 0.15s',
            boxShadow: hoveredEntity === ent ? `0 0 0 3px ${style.bg}` : 'none'
          }}
        >
          {ent.text}
        </mark>
      );
      lastIndex = ent.end;
    });

    if (lastIndex < text.length) parts.push(<span key="end">{text.slice(lastIndex)}</span>);
    return <p style={{lineHeight: 1.9, fontSize: '15px', color: '#334155'}}>{parts}</p>;
  };

  return (
    <div style={{minHeight: '100vh', background: '#f0f4f8'}}>
      
      {/* HEADER */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '18px'
          }}>
            ⚕
          </div>
          <div>
            <h1 style={{fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px'}}>
              Clinical NER
            </h1>
            <p style={{fontSize: '12px', color: '#64748b', margin: 0, marginTop: '-2px'}}>
              Hospital Information Management System
            </p>
          </div>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '20px',
            background: backendStatus === 'connected' ? '#ecfdf5' : '#fef2f2',
            border: `1.5px solid ${backendStatus === 'connected' ? '#10b981' : '#ef4444'}`,
            fontSize: '13px', fontWeight: 600,
            color: backendStatus === 'connected' ? '#059669' : '#dc2626'
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: backendStatus === 'connected' ? '#10b981' : '#ef4444',
              display: 'inline-block'
            }}/>
            {backendStatus === 'connected' ? 'Backend Connected' : 'Backend Offline'}
          </div>
        </div>
      </header>

      <main style={{maxWidth: '1200px', margin: '0 auto', padding: '32px 24px'}}>
        
        {/* DEMO BANNER */}
        <div style={{
          background: '#fef3c7',
          border: '1.5px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <p style={{margin: 0, fontWeight: 700, color: '#92400e', fontSize: '14px'}}>
              ⚡ Demo Mode Available
            </p>
            <p style={{margin: '4px 0 0 0', color: '#a16207', fontSize: '13px'}}>
              Load pre-filled clinical data with extracted entities instantly — no backend needed.
            </p>
          </div>
          <button
            onClick={handleDemo}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#f59e0b',
              color: 'white',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
              whiteSpace: 'nowrap'
            }}
          >
            <Icons.Play /> Load Demo Data
          </button>
        </div>

        {/* INPUT CARD */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Tabs */}
          <div style={{display: 'flex', borderBottom: '1px solid #e2e8f0'}}>
            {[
              {id: 'text', label: '📝 Type / Paste Text'},
              {id: 'upload', label: '📁 Upload Document'}
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  background: activeTab === tab.id ? '#ffffff' : '#f8fafc',
                  color: activeTab === tab.id ? '#0891b2' : '#64748b',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '3px solid #0891b2' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{padding: '24px'}}>
            {activeTab === 'text' ? (
              <div>
                <label style={{display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                  Clinical Notes
                </label>
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); setEntities([]); setStats(null); }}
                  placeholder="Paste clinical notes, discharge summaries, or diagnostic reports here..."
                  style={{
                    width: '100%',
                    minHeight: '160px',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '15px',
                    lineHeight: 1.7,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    color: '#1e293b',           // ← FIXED: Dark but readable text
                    backgroundColor: '#ffffff'   // ← FIXED: White background always
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#0891b2'; e.target.style.boxShadow = '0 0 0 3px rgba(8,145,178,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `2.5px dashed ${dragOver ? '#0891b2' : '#cbd5e1'}`,
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: dragOver ? '#f0fdff' : '#f8fafc',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept=".txt,.docx,.pdf"
                  style={{display: 'none'}}
                  onChange={(e) => e.target.files[0] && setFile(e.target.files[0])}
                />
                <div style={{color: '#0891b2', marginBottom: '12px', display: 'flex', justifyContent: 'center'}}>
                  <Icons.Upload />
                </div>
                <p style={{fontWeight: 700, color: '#334155', marginBottom: '4px'}}>
                  {file ? file.name : 'Drag & drop a file here'}
                </p>
                <p style={{fontSize: '13px', color: '#64748b'}}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB — Click Extract to process` : 'Supports .txt, .docx, .pdf'}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', flexWrap: 'wrap', gap: '12px'}}>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button
                  onClick={activeTab === 'text' ? handleExtract : handleFileUpload}
                  disabled={loading || (activeTab === 'text' ? !text.trim() : !file)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: loading ? '#7dd3fc' : '#0891b2',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(8,145,178,0.35)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { if (!loading) e.target.style.background = '#0e7490'; }}
                  onMouseLeave={(e) => { if (!loading) e.target.style.background = '#0891b2'; }}
                >
                  {loading ? '⏳ Processing...' : '🔍 Extract Entities'}
                </button>

                {(entities.length > 0 || file) && (
                  <button
                    onClick={clearAll}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Icons.Trash /> Clear
                  </button>
                )}
              </div>

              {entities.length > 0 && (
                <div style={{display: 'flex', gap: '10px'}}>
                  <button onClick={exportJSON} style={exportBtnStyle}>
                    <Icons.Download /> JSON
                  </button>
                  <button onClick={exportCSV} style={exportBtnStyle}>
                    <Icons.Download /> CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RESULTS DASHBOARD */}
        {entities.length > 0 && stats && (
          <div style={{marginTop: '32px'}}>
            
            {/* Stats Cards */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px'}}>
              <StatCard
                title="Total Entities"
                value={stats.total}
                sub={`${Object.keys(stats.by_type).length} types found`}
                color="#0891b2"
              />
              {Object.entries(stats.by_type).map(([type, count]) => {
                const style = getStyle(type);
                return (
                  <StatCard
                    key={type}
                    title={style.label}
                    value={count}
                    sub="extracted"
                    color={style.color}
                    bg={style.bg}
                  />
                );
              })}
            </div>

            {/* Filters */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <span style={{fontWeight: 700, fontSize: '14px', color: '#475569'}}>Filters:</span>
              
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{fontSize: '13px', color: '#64748b', fontWeight: 600}}>Min Confidence:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  style={{width: '120px', accentColor: '#0891b2'}}
                />
                <span style={{fontSize: '13px', fontWeight: 700, color: '#0891b2', minWidth: '36px'}}>
                  {threshold.toFixed(2)}
                </span>
              </div>

              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                {uniqueTypes.map(type => {
                  const style = getStyle(type);
                  const hidden = hiddenTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: `1.5px solid ${hidden ? '#e2e8f0' : style.color}`,
                        background: hidden ? '#f8fafc' : style.bg,
                        color: hidden ? '#94a3b8' : style.color,
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s'
                      }}
                    >
                      {!hidden && <Icons.Check />}
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split View */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
              
              {/* Left: Highlighted Text */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
                maxHeight: '600px',
                overflow: 'auto'
              }}>
                <h3 style={{fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '20px'}}>📝</span> Highlighted Text
                  <span style={{marginLeft: 'auto', fontSize: '12px', color: '#64748b', fontWeight: 500}}>
                    {filteredEntities.length} shown
                  </span>
                </h3>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '20px',
                  borderLeft: '4px solid #0891b2'
                }}>
                  {renderHighlightedText()}
                </div>
              </div>

              {/* Right: Entity Table */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
                maxHeight: '600px',
                overflow: 'auto'
              }}>
                <h3 style={{fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '20px'}}>📊</span> Entity Details
                </h3>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                      <th style={thStyle}>Entity</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Confidence</th>
                      <th style={thStyle}>Pos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntities.map((e, i) => {
                      const style = getStyle(e.label);
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: hoveredEntity === e ? '#f0fdff' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={() => setHoveredEntity(e)}
                          onMouseLeave={() => setHoveredEntity(null)}
                        >
                          <td style={{padding: '10px 8px', fontWeight: 700, color: '#334155'}}>{e.text}</td>
                          <td style={{padding: '10px 8px'}}>
                            <span style={{
                              background: style.bg,
                              color: style.color,
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: `1px solid ${style.color}`
                            }}>
                              {style.label}
                            </span>
                          </td>
                          <td style={{padding: '10px 8px', fontFamily: 'monospace', fontSize: '13px', color: '#475569'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <div style={{
                                width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${e.score * 100}%`, height: '100%', background: style.color, borderRadius: '3px'
                                }}/>
                              </div>
                              {e.score}
                            </div>
                          </td>
                          <td style={{padding: '10px 8px', color: '#94a3b8', fontSize: '12px'}}>{e.start}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredEntities.length === 0 && (
                  <p style={{textAlign: 'center', color: '#94a3b8', padding: '40px', fontSize: '14px'}}>
                    No entities match your current filters.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: '#94a3b8',
        fontSize: '13px',
        borderTop: '1px solid #e2e8f0',
        marginTop: '48px'
      }}>
        Clinical NER System — Powered by DistilBERT
      </footer>
    </div>
  );
}

function StatCard({ title, value, sub, color, bg = '#ffffff' }) {
  return (
    <div style={{
      background: bg,
      borderRadius: '14px',
      padding: '20px',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <span style={{fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
        {title}
      </span>
      <span style={{fontSize: '32px', fontWeight: 800, color: color}}>
        {value}
      </span>
      <span style={{fontSize: '12px', color: '#94a3b8', fontWeight: 500}}>
        {sub}
      </span>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '12px 8px',
  color: '#64748b',
  fontWeight: 700,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const exportBtnStyle = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: '1.5px solid #e2e8f0',
  background: '#ffffff',
  color: '#475569',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s'
};

export default App;