import { useState, useEffect, useMemo } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TOTAL_WEEKS = 7;
const PLATFORMS = ["tiktok", "facebook", "telegram"];
const PLATFORM_META = {
  tiktok:   { label: "TikTok",   icon: "🎵", color: "#00c8c8" },
  facebook: { label: "Facebook", icon: "📘", color: "#1877f2" },
  telegram: { label: "Telegram", icon: "✈️", color: "#29b6f6" },
};

const DEFAULT_ENTERPRISES = [
  "Acme Holdings","Bluewave Finance","Crest Logistics","Delta Retail Group",
  "Emerald Properties","Falcon Industries","Greenfield Energy","Horizon Pharmaceuticals",
  "Ironclad Security","Jade Manufacturing","Keystone Construction","Lighthouse Media",
  "Momentum Automotive","Nexus Healthcare","Orbit Tech Solutions","Pinnacle Foods",
  "Quantum Engineering","Redwood Capital","Skybridge Aviation","TerraFirm Agriculture",
  "Unity Telecom","Vanguard Insurance","Westgate Tourism","Xcellerate Education",
  "Zenith Consulting",
];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const KEY = "orbit_kasma_v3";
const load = () => { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const persist = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

const initState = () => {
  const saved = load();
  if (saved) return saved;
  return {
    enterprises: DEFAULT_ENTERPRISES.map((name, i) => ({ id: `e${i}`, name })),
    posts: {},
    startDate: "",
    projectName: "Orbit Innovation Hub",
    consultantName: "Kasma Digitals",
  };
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const pk = (eid, week, platform) => `${eid}_w${week}_${platform}`;
const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));

const weekDateRange = (startDate, weekNum) => {
  if (!startDate) return null;
  const s = new Date(startDate);
  s.setDate(s.getDate() + (weekNum - 1) * 7);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(s)} – ${fmt(e)}`;
};

const guessCurrentWeek = (startDate) => {
  if (!startDate) return 1;
  const today = new Date();
  const start = new Date(startDate);
  const diff = Math.floor((today - start) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(diff + 1, 1), TOTAL_WEEKS);
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(initState);
  const [activeWeek, setActiveWeek] = useState(1);
  const [view, setView] = useState("tracker");
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState("");
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    startDate: "",
    projectName: "Orbit Innovation Hub",
    consultantName: "Kasma Digitals",
  });

  // Open settings on first load if no start date set
  useEffect(() => {
    const s = initState();
    setSettingsForm({ startDate: s.startDate || "", projectName: s.projectName, consultantName: s.consultantName });
    if (!s.startDate) setShowSettings(true);
  }, []);

  useEffect(() => { persist(data); }, [data]);

  useEffect(() => {
    if (data.startDate) setActiveWeek(guessCurrentWeek(data.startDate));
  }, [data.startDate]);

  const openSettings = () => {
    setSettingsForm({ startDate: data.startDate || "", projectName: data.projectName, consultantName: data.consultantName });
    setShowSettings(true);
  };

  const saveSettings = () => {
    if (!settingsForm.startDate) return;
    setData(p => ({ ...p, startDate: settingsForm.startDate, projectName: settingsForm.projectName, consultantName: settingsForm.consultantName }));
    setShowSettings(false);
    flash("✅ Settings saved");
  };

  // ─── DATA ────────────────────────────────────────────────────────────────
  const getStatus = (eid, week, platform) => !!data.posts[pk(eid, week, platform)];

  const toggle = (eid, week, platform) => {
    const k = pk(eid, week, platform);
    setData(p => ({ ...p, posts: { ...p.posts, [k]: !p.posts[k] } }));
  };

  const ewStats = (eid, week) => {
    const posted = PLATFORMS.filter(p => getStatus(eid, week, p)).length;
    return { posted, remaining: 3 - posted, pct: pct(posted, 3) };
  };

  const eTotalStats = (eid) => {
    const total = TOTAL_WEEKS * 3;
    const posted = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1)
      .reduce((acc, w) => acc + PLATFORMS.filter(p => getStatus(eid, w, p)).length, 0);
    return { posted, remaining: total - posted, pct: pct(posted, total) };
  };

  const weekTotals = (week) => {
    const total = data.enterprises.length * 3;
    const posted = data.enterprises.reduce((acc, e) => acc + ewStats(e.id, week).posted, 0);
    return { total, posted, remaining: total - posted, pct: pct(posted, total) };
  };

  const projectStats = useMemo(() => {
    const total = data.enterprises.length * TOTAL_WEEKS * 3;
    const posted = data.enterprises.reduce((acc, e) => {
      return acc + Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1)
        .reduce((a, w) => a + PLATFORMS.filter(p => getStatus(e.id, w, p)).length, 0);
    }, 0);
    return { total, posted, remaining: total - posted, pct: pct(posted, total) };
  }, [data]);

  const thisWeek = weekTotals(activeWeek);

  const filtered = useMemo(() => {
    return data.enterprises.filter(e => {
      const nameMatch = e.name.toLowerCase().includes(search.toLowerCase());
      const s = ewStats(e.id, activeWeek);
      const incMatch = !showIncomplete || s.remaining > 0;
      const pfMatch = platformFilter === "all" || !getStatus(e.id, activeWeek, platformFilter);
      return nameMatch && incMatch && pfMatch;
    });
  }, [data, search, showIncomplete, platformFilter, activeWeek]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────
  const markAllVisible = () => {
    const p = { ...data.posts };
    filtered.forEach(e => PLATFORMS.forEach(pl => { p[pk(e.id, activeWeek, pl)] = true; }));
    setData(prev => ({ ...prev, posts: p }));
    flash("✅ All visible enterprises marked as posted");
  };

  const clearVisible = () => {
    const p = { ...data.posts };
    filtered.forEach(e => PLATFORMS.forEach(pl => { p[pk(e.id, activeWeek, pl)] = false; }));
    setData(prev => ({ ...prev, posts: p }));
    flash("Cleared statuses for visible enterprises");
  };

  const addEnterprise = () => {
    if (!newName.trim()) return;
    const id = `e${Date.now()}`;
    setData(p => ({ ...p, enterprises: [...p.enterprises, { id, name: newName.trim() }] }));
    flash(`"${newName.trim()}" added`);
    setNewName(""); setShowAdd(false);
  };

  const deleteEnterprise = (id) => {
    setData(p => ({ ...p, enterprises: p.enterprises.filter(e => e.id !== id) }));
    flash("Enterprise removed");
  };

  const saveEdit = (id) => {
    if (!editingName.trim()) return;
    setData(p => ({ ...p, enterprises: p.enterprises.map(e => e.id === id ? { ...e, name: editingName.trim() } : e) }));
    setEditingId(null); flash("Name updated");
  };

  const exportCSV = () => {
    const rows = [["Enterprise","Week","Date Range","TikTok","Facebook","Telegram","Posted","Remaining","Week %","Project %"]];
    data.enterprises.forEach(e => {
      Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).forEach(w => {
        const s = ewStats(e.id, w);
        const ts = eTotalStats(e.id);
        const dr = weekDateRange(data.startDate, w) || `Week ${w}`;
        rows.push([e.name, `Week ${w}`, dr,
          getStatus(e.id,w,"tiktok")?"Yes":"No",
          getStatus(e.id,w,"facebook")?"Yes":"No",
          getStatus(e.id,w,"telegram")?"Yes":"No",
          s.posted, s.remaining, `${s.pct}%`, `${ts.pct}%`]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "orbit-kasma-tracker.csv"; a.click();
    flash("📊 CSV exported!");
  };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // ─── THEME ───────────────────────────────────────────────────────────────
  const t = {
    bg:      dark ? "#070b12" : "#eef1f8",
    surface: dark ? "#0c1120" : "#ffffff",
    card:    dark ? "#101624" : "#ffffff",
    border:  dark ? "#192030" : "#dde2f0",
    border2: dark ? "#1e2c40" : "#ccd3e8",
    text:    dark ? "#dde8f8" : "#0f1623",
    sub:     dark ? "#4a5e7a" : "#8492aa",
    muted:   dark ? "#0e1828" : "#f2f4fb",
    accent:  "#3b82f6",
    green:   "#22c55e",
    amber:   "#f59e0b",
    red:     "#ef4444",
    purple:  "#8b5cf6",
  };

  // ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────
  const ProgressBar = ({ value, color, height = 5 }) => (
    <div style={{ height, borderRadius: 99, background: t.border2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: 99, background: color || (value === 100 ? t.green : value >= 67 ? t.amber : t.accent), transition: "width .5s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );

  const Badge = ({ value }) => {
    const color = value === 100 ? t.green : value >= 67 ? t.amber : value > 0 ? t.accent : t.sub;
    const bg = value === 100 ? (dark?"#052e16":"#f0fdf4") : value >= 67 ? (dark?"#431407":"#fffbeb") : value > 0 ? (dark?"#0a1830":"#eff6ff") : t.muted;
    return <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:5, background:bg, color, whiteSpace:"nowrap" }}>{value}%</span>;
  };

  const ToggleBtn = ({ eid, week, platform }) => {
    const on = getStatus(eid, week, platform);
    return (
      <button onClick={() => toggle(eid, week, platform)} style={{
        width:36, height:36, borderRadius:9,
        border:`2px solid ${on ? t.green : t.border2}`,
        background: on ? (dark?"#052e16":"#f0fdf4") : t.muted,
        cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center",
        margin:"0 auto", transition:"all .15s", outline:"none",
      }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.12)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
        onMouseDown={e => e.currentTarget.style.transform="scale(.9)"}
        onMouseUp={e => e.currentTarget.style.transform="scale(1.05)"}
      >{on ? "✅" : "❌"}</button>
    );
  };

  // ─── SETTINGS MODAL ──────────────────────────────────────────────────────
  const SettingsModal = () => (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400, padding:16 }}
      onClick={() => { if (data.startDate) setShowSettings(false); }}>
      <div style={{ background:t.card, borderRadius:20, padding:28, width:"100%", maxWidth:440, border:`1px solid ${t.border2}`, maxHeight:"90vh", overflowY:"auto" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 0 20px #3b82f640" }}>🛰️</div>
          <div>
            <div style={{ fontWeight:800, fontSize:17 }}>Project Setup</div>
            <div style={{ fontSize:11, color:t.sub }}>Configure your 7-week campaign details</div>
          </div>
        </div>

        <div style={{ height:1, background:t.border, marginBottom:20 }} />

        {/* Project name */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, color:t.sub, letterSpacing:".5px", textTransform:"uppercase", display:"block", marginBottom:6 }}>Project Lead / Client</label>
          <input value={settingsForm.projectName}
            onChange={e => setSettingsForm(p => ({ ...p, projectName: e.target.value }))}
            placeholder="e.g. Orbit Innovation Hub"
            style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${t.border2}`, background:t.muted, color:t.text, fontSize:13 }} />
        </div>

        {/* Consultant */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, color:t.sub, letterSpacing:".5px", textTransform:"uppercase", display:"block", marginBottom:6 }}>Consultant Agency</label>
          <input value={settingsForm.consultantName}
            onChange={e => setSettingsForm(p => ({ ...p, consultantName: e.target.value }))}
            placeholder="e.g. Kasma Digitals"
            style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${t.border2}`, background:t.muted, color:t.text, fontSize:13 }} />
        </div>

        {/* Start date */}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, fontWeight:700, color:t.sub, letterSpacing:".5px", textTransform:"uppercase", display:"block", marginBottom:6 }}>
            Project Start Date <span style={{ color:t.red }}>*</span>
          </label>
          <input type="date" value={settingsForm.startDate}
            onChange={e => setSettingsForm(p => ({ ...p, startDate: e.target.value }))}
            style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${settingsForm.startDate ? t.border2 : t.red}`, background:t.muted, color:t.text, fontSize:13, fontFamily:"'DM Mono',monospace" }} />

          {/* Week preview */}
          {settingsForm.startDate && (
            <div style={{ marginTop:10, borderRadius:9, border:`1px solid ${t.border}`, overflow:"hidden" }}>
              <div style={{ padding:"8px 12px", background:t.muted, fontSize:10, fontWeight:700, color:t.sub, letterSpacing:".5px", textTransform:"uppercase" }}>Week Schedule Preview</div>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
                <div key={w} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 12px", borderTop:`1px solid ${t.border}`, background: w % 2 === 0 ? t.muted : "transparent" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:t.accent }}>Week {w}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:t.sub }}>{weekDateRange(settingsForm.startDate, w)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={saveSettings} disabled={!settingsForm.startDate}
          style={{ width:"100%", padding:12, borderRadius:10, background: settingsForm.startDate ? t.accent : t.border2, color: settingsForm.startDate ? "white" : t.sub, border:"none", cursor: settingsForm.startDate ? "pointer" : "not-allowed", fontWeight:800, fontSize:14, transition:"all .2s", letterSpacing:"-.2px" }}>
          {data.startDate ? "Save Changes" : "Start Tracking →"}
        </button>
        {data.startDate && (
          <button onClick={() => setShowSettings(false)}
            style={{ width:"100%", marginTop:8, padding:10, borderRadius:10, background:"none", color:t.sub, border:`1px solid ${t.border}`, cursor:"pointer", fontSize:13 }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:t.bg, color:t.text, fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif", fontSize:14 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:${t.border2};border-radius:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        input,button,select{font-family:inherit;outline:none;}
        .row-h:hover{background:${dark?"#0e1928":"#f5f7ff"} !important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .anim{animation:fadeUp .3s ease both;}
        .week-pill{cursor:pointer;border-radius:12px;font-size:12px;font-weight:700;border:none;transition:all .18s;white-space:nowrap;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 14px;}
        .chip{display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid ${t.border2};transition:all .15s;background:none;color:${t.sub};}
        .chip.on{background:${t.accent};color:white;border-color:${t.accent};}
        .chip:hover:not(.on){border-color:${t.accent};color:${t.accent};}
        .act-btn{padding:7px 13px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid ${t.border2};background:none;color:${t.sub};transition:all .15s;}
        .act-btn:hover{border-color:${t.accent};color:${t.accent};}
        .ico-btn{cursor:pointer;opacity:.4;transition:opacity .15s;background:none;border:none;font-size:13px;padding:3px;}
        .ico-btn:hover{opacity:1;}
        .nav-btn{padding:6px 13px;border-radius:7px;border:none;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;}
        @media(max-width:680px){.hide-sm{display:none!important;}.tbl{overflow-x:auto;}}
      `}</style>

      {showSettings && <SettingsModal />}

      {/* ── HEADER ── */}
      <header style={{ background:t.surface, borderBottom:`1px solid ${t.border}`, padding:"0 18px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1320, margin:"0 auto", height:54, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, boxShadow:"0 0 14px #3b82f640" }}>🛰️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:13, letterSpacing:"-.4px" }}>
                {data.projectName || "Orbit"}<span style={{color:t.accent}}> × </span>{data.consultantName || "Kasma"}
              </div>
              <div style={{ fontSize:10, color:t.sub, fontFamily:"DM Mono", letterSpacing:".3px" }}>7-WEEK POST TRACKER</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:2, marginLeft:14 }}>
            {[["tracker","📋 Tracker"],["overview","🗓 Overview"],["analytics","📊 Analytics"]].map(([v,l]) => (
              <button key={v} className="nav-btn" onClick={() => setView(v)}
                style={{ background:view===v?t.accent:"none", color:view===v?"white":t.sub }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ marginLeft:"auto", display:"flex", gap:7, alignItems:"center" }}>
            <div className="hide-sm" style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 11px", borderRadius:20, background:t.muted, border:`1px solid ${t.border}` }}>
              <div style={{ width:6, height:6, borderRadius:99, background:t.green, boxShadow:`0 0 6px ${t.green}` }} />
              <span style={{ fontSize:10, fontWeight:600, color:t.sub }}>Project</span>
              <span style={{ fontFamily:"DM Mono", fontSize:11, fontWeight:700, color:t.accent }}>{projectStats.pct}%</span>
            </div>
            <button onClick={openSettings}
              title="Project Settings"
              style={{ width:30, height:30, borderRadius:7, border:`1px solid ${t.border}`, background:t.muted, cursor:"pointer", fontSize:14, color:t.sub }}>⚙️</button>
            <button onClick={() => setDark(!dark)}
              style={{ width:30, height:30, borderRadius:7, border:`1px solid ${t.border}`, background:t.muted, cursor:"pointer", fontSize:14, color:t.text }}>{dark?"☀️":"🌙"}</button>
          </div>
        </div>
      </header>

      {/* ── BANNER ── */}
      <div style={{ background:dark?"linear-gradient(135deg,#090f1e,#06101c)":"linear-gradient(135deg,#e8eeff,#f0f5ff)", borderBottom:`1px solid ${t.border}`, padding:"14px 18px" }}>
        <div style={{ maxWidth:1320, margin:"0 auto" }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:".8px", color:t.accent, textTransform:"uppercase" }}>{data.projectName || "Orbit Innovation Hub"}</span>
            <span style={{ color:t.border2 }}>·</span>
            <span style={{ fontSize:11, color:t.sub }}>Consultant: <b style={{color:t.text}}>{data.consultantName || "Kasma Digitals"}</b></span>
            {data.startDate ? (
              <>
                <span style={{ color:t.border2 }}>·</span>
                <span style={{ fontSize:11, color:t.sub, fontFamily:"DM Mono" }}>
                  {weekDateRange(data.startDate, 1)} → {weekDateRange(data.startDate, TOTAL_WEEKS)}
                </span>
              </>
            ) : (
              <button onClick={openSettings} style={{ fontSize:11, color:t.amber, background:"none", border:`1px solid ${t.amber}40`, borderRadius:6, padding:"2px 9px", cursor:"pointer", fontWeight:600 }}>
                ⚠️ Tap ⚙️ to set start date
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(118px,1fr))", gap:8, marginBottom:12 }}>
            {[
              { icon:"🏢", label:"Enterprises",  val:data.enterprises.length,              color:t.accent },
              { icon:"📅", label:"Total Weeks",   val:TOTAL_WEEKS,                          color:t.purple },
              { icon:"📨", label:"Total Posts",   val:projectStats.total.toLocaleString(),  color:t.sub },
              { icon:"✅", label:"Posted",         val:projectStats.posted.toLocaleString(), color:t.green },
              { icon:"⏳", label:"Remaining",     val:projectStats.remaining.toLocaleString(), color:t.amber },
              { icon:"📊", label:"Completion",    val:`${projectStats.pct}%`,               color:projectStats.pct===100?t.green:t.accent },
            ].map((s,i) => (
              <div key={i} style={{ background:t.card, borderRadius:10, padding:"10px 12px", border:`1px solid ${t.border}` }}>
                <div style={{ fontSize:16, marginBottom:3 }}>{s.icon}</div>
                <div style={{ fontFamily:"DM Mono", fontSize:18, fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:10, color:t.sub, marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11 }}>
              <span style={{color:t.sub}}>Overall project completion</span>
              <span style={{ fontFamily:"DM Mono", color:t.accent, fontWeight:700 }}>{projectStats.posted.toLocaleString()} / {projectStats.total.toLocaleString()} posts</span>
            </div>
            <ProgressBar value={projectStats.pct} height={7} />
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:1320, margin:"0 auto", padding:"18px 16px" }}>

        {/* ══ TRACKER ══ */}
        {view === "tracker" && (
          <>
            {/* Week pills */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:14 }}>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => {
                const ws = weekTotals(w);
                const active = activeWeek === w;
                const dr = weekDateRange(data.startDate, w);
                return (
                  <button key={w} className="week-pill" onClick={() => setActiveWeek(w)}
                    style={{ background: active ? t.accent : (dark?"#101624":"#fff"), color: active?"white":t.sub, border:`1.5px solid ${active?t.accent:t.border2}`, boxShadow:active?`0 0 18px ${t.accent}45`:"none" }}>
                    <span style={{ fontSize:13 }}>Week {w}</span>
                    {dr && <span style={{ fontSize:9, opacity:.75, fontFamily:"DM Mono", fontWeight:400 }}>{dr}</span>}
                    <span style={{ fontSize:11, fontFamily:"DM Mono", color:active?"white":ws.pct===100?t.green:ws.pct>=67?t.amber:t.sub }}>
                      {ws.pct}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Week summary */}
            <div style={{ background:t.card, borderRadius:12, padding:"12px 16px", marginBottom:12, border:`1px solid ${t.border}`, display:"flex", gap:14, flexWrap:"wrap", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:17 }}>Week {activeWeek}</div>
                <div style={{ fontSize:11, color:t.sub, fontFamily:"DM Mono" }}>
                  {weekDateRange(data.startDate, activeWeek) || "⚙️ Set start date to see dates"}
                </div>
              </div>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:11 }}>
                  <span style={{color:t.sub}}>Week progress</span>
                  <span style={{ fontFamily:"DM Mono", color:t.accent, fontWeight:700 }}>{thisWeek.posted}/{thisWeek.total}</span>
                </div>
                <ProgressBar value={thisWeek.pct} height={6}/>
              </div>
              {[
                {label:"Posted",    val:thisWeek.posted,    color:t.green},
                {label:"Remaining", val:thisWeek.remaining, color:t.amber},
                {label:"Week %",    val:`${thisWeek.pct}%`, color:t.accent},
              ].map(s=>(
                <div key={s.label} style={{ textAlign:"center", minWidth:52 }}>
                  <div style={{ fontFamily:"DM Mono", fontSize:17, fontWeight:700, color:s.color, lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:10, color:t.sub, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{ background:t.card, borderRadius:10, padding:"10px 14px", marginBottom:12, border:`1px solid ${t.border}`, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search enterprise…"
                style={{ flex:1, minWidth:140, padding:"7px 11px", borderRadius:8, border:`1.5px solid ${t.border}`, background:t.muted, color:t.text, fontSize:13 }} />
              <button className={`chip ${showIncomplete?"on":""}`} onClick={()=>setShowIncomplete(!showIncomplete)}>⚠️ Incomplete</button>
              {PLATFORMS.map(p=>(
                <button key={p} className={`chip ${platformFilter===p?"on":""}`}
                  onClick={()=>setPlatformFilter(platformFilter===p?"all":p)}>
                  {PLATFORM_META[p].icon} {PLATFORM_META[p].label}
                </button>
              ))}
              <div style={{ display:"flex", gap:6, marginLeft:"auto", flexWrap:"wrap" }}>
                <button className="act-btn" onClick={markAllVisible}>✅ Mark All</button>
                <button className="act-btn" onClick={clearVisible}>Clear</button>
                <button className="act-btn" onClick={exportCSV}>⬇️ CSV</button>
                <button onClick={()=>setShowAdd(true)} style={{ padding:"7px 13px", borderRadius:8, background:t.accent, color:"white", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>+ Add</button>
              </div>
            </div>

            {/* Add modal */}
            {showAdd && (
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
                onClick={()=>setShowAdd(false)}>
                <div style={{ background:t.card, borderRadius:16, padding:24, width:320, border:`1px solid ${t.border2}` }}
                  onClick={e=>e.stopPropagation()}>
                  <div style={{ fontWeight:800, marginBottom:14, fontSize:15 }}>Add Enterprise</div>
                  <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addEnterprise()} placeholder="Enterprise name…"
                    style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1.5px solid ${t.border2}`, background:t.muted, color:t.text, fontSize:13, marginBottom:12 }} />
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={addEnterprise} style={{ flex:1,padding:9,borderRadius:8,background:t.accent,color:"white",border:"none",cursor:"pointer",fontWeight:700 }}>Add</button>
                    <button onClick={()=>setShowAdd(false)} style={{ flex:1,padding:9,borderRadius:8,border:`1px solid ${t.border}`,background:"none",color:t.text,cursor:"pointer" }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="anim" style={{ background:t.card, borderRadius:12, border:`1px solid ${t.border}`, overflow:"hidden" }}>
              <div className="tbl">
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:660 }}>
                  <thead>
                    <tr style={{ background:t.muted, borderBottom:`1px solid ${t.border}` }}>
                      {["#","Enterprise","TikTok","Facebook","Telegram","Progress","Posted","Left","%",""].map((h,i)=>(
                        <th key={i} style={{ padding:"9px 10px", textAlign:i<=1?"left":"center", fontSize:10, fontWeight:700, color:t.sub, letterSpacing:".6px", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length===0&&(
                      <tr><td colSpan={10} style={{ textAlign:"center", padding:48, color:t.sub, fontSize:13 }}>No enterprises match your filters</td></tr>
                    )}
                    {filtered.map((e, idx) => {
                      const s = ewStats(e.id, activeWeek);
                      const ts = eTotalStats(e.id);
                      const isEd = editingId===e.id;
                      const hue = (data.enterprises.findIndex(x=>x.id===e.id)*37)%360;
                      return (
                        <tr key={e.id} className="row-h" style={{ borderBottom:`1px solid ${t.border}`, transition:"background .12s" }}>
                          <td style={{ padding:"10px 10px", fontSize:11, color:t.sub, fontFamily:"DM Mono", width:34 }}>{String(idx+1).padStart(2,"0")}</td>
                          <td style={{ padding:"10px 10px", minWidth:180 }}>
                            {isEd ? (
                              <input autoFocus value={editingName} onChange={e2=>setEditingName(e2.target.value)}
                                onKeyDown={e2=>{ if(e2.key==="Enter")saveEdit(e.id); if(e2.key==="Escape")setEditingId(null); }}
                                style={{ padding:"4px 8px", borderRadius:6, border:`1.5px solid ${t.accent}`, background:t.muted, color:t.text, fontSize:13, width:"100%" }} />
                            ):(
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <div style={{ width:28,height:28,borderRadius:7,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,background:`hsl(${hue},55%,${dark?"22%":"90%"})`,color:`hsl(${hue},55%,${dark?"65%":"38%"})` }}>
                                  {e.name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontSize:13, fontWeight:600 }}>{e.name}</div>
                                  <div style={{ fontSize:10, color:t.sub, fontFamily:"DM Mono" }}>Project: {ts.pct}%</div>
                                </div>
                              </div>
                            )}
                          </td>
                          {PLATFORMS.map(pl=>(
                            <td key={pl} style={{ padding:"9px 6px", textAlign:"center" }}>
                              <ToggleBtn eid={e.id} week={activeWeek} platform={pl}/>
                            </td>
                          ))}
                          <td style={{ padding:"10px 10px", minWidth:90 }}>
                            <ProgressBar value={s.pct}/>
                            <div style={{ fontSize:9, color:t.sub, textAlign:"center", marginTop:3, fontFamily:"DM Mono" }}>week {activeWeek}</div>
                          </td>
                          <td style={{ padding:"10px 8px", textAlign:"center", fontFamily:"DM Mono", fontSize:14, fontWeight:700, color:t.green }}>{s.posted}</td>
                          <td style={{ padding:"10px 8px", textAlign:"center", fontFamily:"DM Mono", fontSize:14, fontWeight:700, color:s.remaining>0?t.red:t.sub }}>{s.remaining}</td>
                          <td style={{ padding:"10px 8px", textAlign:"center" }}><Badge value={s.pct}/></td>
                          <td style={{ padding:"10px 7px", textAlign:"center" }}>
                            <div style={{ display:"flex", gap:1, justifyContent:"center" }}>
                              {isEd ? (
                                <>
                                  <button className="ico-btn" onClick={()=>saveEdit(e.id)} style={{color:t.green,opacity:1}}>✓</button>
                                  <button className="ico-btn" onClick={()=>setEditingId(null)} style={{color:t.red,opacity:1}}>✕</button>
                                </>
                              ):(
                                <>
                                  <button className="ico-btn" onClick={()=>{setEditingId(e.id);setEditingName(e.name);}}>✏️</button>
                                  <button className="ico-btn" onClick={()=>deleteEnterprise(e.id)}>🗑️</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:"8px 14px", borderTop:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", fontSize:11, color:t.sub }}>
                <span>{filtered.length} of {data.enterprises.length} enterprises shown</span>
                <span style={{ fontFamily:"DM Mono" }}>Week {activeWeek} of {TOTAL_WEEKS}</span>
              </div>
            </div>
          </>
        )}

        {/* ══ OVERVIEW ══ */}
        {view === "overview" && (
          <div className="anim" style={{ background:t.card, borderRadius:12, border:`1px solid ${t.border}`, overflow:"hidden" }}>
            <div style={{ padding:"13px 18px", borderBottom:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:15 }}>7-Week Grid Overview</div>
                <div style={{ fontSize:11, color:t.sub }}>All 25 enterprises × Week 1–7 · Click any cell to jump to that week</div>
              </div>
              <button className="act-btn" onClick={exportCSV}>⬇️ Export CSV</button>
            </div>
            <div className="tbl">
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                <thead>
                  <tr style={{ background:t.muted, borderBottom:`1px solid ${t.border}` }}>
                    <th style={{ padding:"10px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:t.sub, textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", position:"sticky", left:0, background:t.muted, zIndex:2 }}>Enterprise</th>
                    {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => {
                      const ws = weekTotals(w);
                      const dr = weekDateRange(data.startDate, w);
                      return (
                        <th key={w} onClick={()=>{setActiveWeek(w);setView("tracker");}}
                          style={{ padding:"10px 8px", textAlign:"center", fontSize:10, fontWeight:700, color:activeWeek===w?t.accent:t.sub, cursor:"pointer", textTransform:"uppercase", letterSpacing:".4px", minWidth:82, whiteSpace:"nowrap" }}>
                          <div>Week {w}</div>
                          {dr && <div style={{ fontFamily:"DM Mono", fontSize:8, opacity:.55, marginTop:2, fontWeight:400 }}>{dr}</div>}
                          <div style={{ fontFamily:"DM Mono", fontSize:9, marginTop:2, color:ws.pct===100?t.green:ws.pct>=67?t.amber:t.sub }}>{ws.pct}%</div>
                        </th>
                      );
                    })}
                    <th style={{ padding:"10px 8px", textAlign:"center", fontSize:10, fontWeight:700, color:t.sub, textTransform:"uppercase", letterSpacing:".4px", whiteSpace:"nowrap" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.enterprises.map((e, idx) => {
                    const ts = eTotalStats(e.id);
                    const hue=(idx*37)%360;
                    return (
                      <tr key={e.id} className="row-h" style={{ borderBottom:`1px solid ${t.border}` }}>
                        <td style={{ padding:"9px 14px", position:"sticky", left:0, background:t.card, zIndex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <div style={{ width:24,height:24,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,background:`hsl(${hue},55%,${dark?"22%":"90%"})`,color:`hsl(${hue},55%,${dark?"65%":"38%"})` }}>
                              {e.name.charAt(0)}
                            </div>
                            <span style={{ fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{e.name}</span>
                          </div>
                        </td>
                        {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => {
                          const s = ewStats(e.id, w);
                          const bgCol = s.pct===100?(dark?"#052e16":"#f0fdf4"):s.pct>=67?(dark?"#431407":"#fffbeb"):s.pct>0?(dark?"#0a1830":"#eff6ff"):t.muted;
                          const txCol = s.pct===100?t.green:s.pct>=67?t.amber:s.pct>0?t.accent:t.sub;
                          return (
                            <td key={w} style={{ padding:"8px 6px", textAlign:"center" }}
                              onClick={()=>{setActiveWeek(w);setView("tracker");}}>
                              <div style={{ width:56,height:30,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:7,background:bgCol,cursor:"pointer",transition:"opacity .15s" }}
                                onMouseEnter={e2=>e2.currentTarget.style.opacity=".7"}
                                onMouseLeave={e2=>e2.currentTarget.style.opacity="1"}>
                                <span style={{ fontFamily:"DM Mono", fontSize:11, fontWeight:700, color:txCol }}>{s.pct}%</span>
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ padding:"9px 8px", textAlign:"center" }}>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                            <Badge value={ts.pct}/>
                            <span style={{ fontFamily:"DM Mono", fontSize:9, color:t.sub }}>{ts.posted}/{ts.posted+ts.remaining}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background:t.muted, borderTop:`2px solid ${t.border}` }}>
                    <td style={{ padding:"9px 14px", fontSize:11, fontWeight:700, color:t.sub, position:"sticky", left:0, background:t.muted }}>Weekly Total</td>
                    {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => {
                      const ws = weekTotals(w);
                      return (
                        <td key={w} style={{ padding:"9px 8px", textAlign:"center" }}>
                          <div style={{ fontFamily:"DM Mono", fontSize:12, fontWeight:700, color:ws.pct===100?t.green:ws.pct>=67?t.amber:t.accent }}>{ws.pct}%</div>
                          <div style={{ fontSize:9, color:t.sub, fontFamily:"DM Mono" }}>{ws.posted}/{ws.total}</div>
                        </td>
                      );
                    })}
                    <td style={{ padding:"9px 8px", textAlign:"center" }}>
                      <div style={{ fontFamily:"DM Mono", fontSize:13, fontWeight:800, color:t.accent }}>{projectStats.pct}%</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ANALYTICS ══ */}
        {view === "analytics" && (
          <div className="anim" style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:t.card, borderRadius:12, padding:18, border:`1px solid ${t.border}` }}>
              <div style={{ fontWeight:800, marginBottom:14, fontSize:14 }}>Platform Performance — Full Project</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))", gap:10 }}>
                {PLATFORMS.map(p => {
                  const total = data.enterprises.length * TOTAL_WEEKS;
                  const posted = data.enterprises.reduce((acc,e)=>acc+Array.from({length:TOTAL_WEEKS},(_,i)=>i+1).filter(w=>getStatus(e.id,w,p)).length,0);
                  const pc = pct(posted,total);
                  return (
                    <div key={p} style={{ background:t.muted, borderRadius:10, padding:16, border:`1px solid ${t.border}` }}>
                      <div style={{ fontSize:26, marginBottom:6 }}>{PLATFORM_META[p].icon}</div>
                      <div style={{ fontWeight:800, fontSize:14, marginBottom:2 }}>{PLATFORM_META[p].label}</div>
                      <div style={{ fontFamily:"DM Mono", fontSize:28, fontWeight:700, color:PLATFORM_META[p].color, lineHeight:1 }}>{pc}%</div>
                      <div style={{ fontSize:11, color:t.sub, margin:"4px 0 8px" }}>{posted} / {total} posts</div>
                      <ProgressBar value={pc} color={PLATFORM_META[p].color} height={5}/>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background:t.card, borderRadius:12, padding:18, border:`1px solid ${t.border}` }}>
              <div style={{ fontWeight:800, marginBottom:14, fontSize:14 }}>Weekly Completion — Bar Chart</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => {
                  const ws = weekTotals(w);
                  const dr = weekDateRange(data.startDate, w);
                  const bc = ws.pct===100?t.green:ws.pct>=67?t.amber:t.accent;
                  return (
                    <div key={w} onClick={()=>{setActiveWeek(w);setView("tracker");}}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
                      <span style={{ fontFamily:"DM Mono", fontSize:11, fontWeight:700, color:bc }}>{ws.pct}%</span>
                      <div style={{ width:"100%", height:90, background:t.muted, borderRadius:7, position:"relative", overflow:"hidden" }}>
                        <div style={{ position:"absolute", bottom:0, width:"100%", height:`${Math.max(ws.pct,3)}%`, background:bc, borderRadius:"5px 5px 0 0", transition:"height .6s cubic-bezier(.4,0,.2,1)" }}/>
                        {activeWeek===w && <div style={{ position:"absolute", inset:0, border:`2px solid ${t.accent}`, borderRadius:7, pointerEvents:"none" }}/>}
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:activeWeek===w?t.accent:t.sub }}>W{w}</span>
                      {dr && <span style={{ fontSize:8, color:t.sub, fontFamily:"DM Mono", textAlign:"center", lineHeight:1.4 }}>{dr}</span>}
                      <span style={{ fontSize:9, color:t.sub, fontFamily:"DM Mono" }}>{ws.posted}/{ws.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background:t.card, borderRadius:12, padding:18, border:`1px solid ${t.border}` }}>
              <div style={{ fontWeight:800, marginBottom:14, fontSize:14 }}>Enterprise Leaderboard — Project Total</div>
              {[...data.enterprises].sort((a,b)=>eTotalStats(b.id).pct-eTotalStats(a.id).pct).map((e,i)=>{
                const ts=eTotalStats(e.id);
                const hue=(data.enterprises.findIndex(x=>x.id===e.id)*37)%360;
                return (
                  <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
                    <div style={{ width:22, fontSize:11, color:t.sub, fontFamily:"DM Mono", textAlign:"right", flexShrink:0, fontWeight:700 }}>#{i+1}</div>
                    <div style={{ width:26,height:26,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,background:`hsl(${hue},55%,${dark?"22%":"90%"})`,color:`hsl(${hue},55%,${dark?"65%":"38%"})` }}>
                      {e.name.charAt(0)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:3 }}>{e.name}</div>
                      <ProgressBar value={ts.pct} height={5}/>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                      <Badge value={ts.pct}/>
                      <span style={{ fontFamily:"DM Mono", fontSize:9, color:t.sub }}>{ts.posted}/{ts.posted+ts.remaining}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop:20, textAlign:"center", fontSize:10, color:t.sub, lineHeight:1.9 }}>
          {data.projectName} × {data.consultantName}<br/>
          <span style={{ fontFamily:"DM Mono" }}>{data.enterprises.length} enterprises · {TOTAL_WEEKS} weeks · {projectStats.total.toLocaleString()} total posts</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:dark?"#1a2235":"#1a1d27", color:"white", padding:"10px 20px", borderRadius:10, fontSize:13, zIndex:999, boxShadow:"0 4px 24px rgba(0,0,0,.4)", animation:"fadeUp .3s ease", whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
