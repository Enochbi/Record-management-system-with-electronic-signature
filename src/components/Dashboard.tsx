import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getAllFDPs, getMyFDPs, getMyPendingFDPs } from "../api";
import { FDP, FDPStatus, UserRole } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  FileText, Plus, Clock, CheckCircle, XCircle, Users,
  CreditCard, Calendar, Search, AlertCircle, ChevronRight,
  Shield, TrendingUp, BarChart2, LogOut, Bell, Activity,
  ArrowUpRight, Layers, Zap, Filter,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   FONTS
───────────────────────────────────────────────────────────── */
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";

/* ─────────────────────────────────────────────────────────────
   PROGRESSIVE ROW REVEAL
   Rows are revealed one-by-one with staggered animation after
   data loads, giving the impression of streaming from newest →
   oldest.
───────────────────────────────────────────────────────────── */
const REVEAL_STEP_MS = 38; // delay between each row appearing

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fdps, setFdps] = useState<FDP[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);   // progressive reveal
  const [loading, setLoading] = useState(true);
  const [skeletonRows] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "mine">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingFdps, setPendingFdps] = useState<FDP[]>([]);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  /* ── Close dropdown on outside click ────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node))
        setRoleDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Role metadata ───────────────────────────────────────── */
  const ROLE_META: Partial<Record<UserRole, { icon: string; desc: string; color: string; bg: string }>> = {
    [UserRole.DEMANDEUR]:              { icon: "✏️", desc: "Créer et suivre vos propres fiches de dépense",        color: "#2563EB", bg: "#EEF3FF" },
    [UserRole.CHEF_SERVICE]:           { icon: "👔", desc: "Valider ou rejeter les fiches de vos collaborateurs",  color: "#7C3AED", bg: "#F5F3FF" },
    [UserRole.RESPONSABLE_COMPTABLE]:  { icon: "📊", desc: "Contrôler la conformité comptable des dépenses",       color: "#0891B2", bg: "#ECFEFF" },
    [UserRole.DIRECTEUR_GENERAL]:      { icon: "🏛️", desc: "Approuver les dépenses en dernière instance",          color: "#D97706", bg: "#FFFBEB" },
    [UserRole.CAISSE]:                 { icon: "💳", desc: "Décaisser et clôturer les fiches validées",            color: "#059669", bg: "#ECFDF5" },
    [UserRole.ADMIN]:                  { icon: "⚙️", desc: "Administrer les utilisateurs et la configuration",     color: "#DC2626", bg: "#FEF2F2" },
  };

  /* ── Available roles ─────────────────────────────────────── */
  const getAvailableRoles = useCallback((): UserRole[] => {
    if (!user) return [];
    switch (user.role) {
      case UserRole.DIRECTEUR_GENERAL:
        return [UserRole.DIRECTEUR_GENERAL, UserRole.CHEF_SERVICE];
      case UserRole.CAISSE:
        return [UserRole.CAISSE, UserRole.DEMANDEUR, UserRole.CHEF_SERVICE];
      default:
        if (user.role !== UserRole.DEMANDEUR && user.role !== UserRole.ADMIN)
          return [user.role as UserRole, UserRole.DEMANDEUR];
        return [user.role as UserRole];
    }
  }, [user]);

  const availableRoles = getAvailableRoles();
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    availableRoles[0] || (user?.role as UserRole)
  );

  /* ── Inject fonts ────────────────────────────────────────── */
  useEffect(() => {
    const id = "fdp-dash-fonts-v2";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet"; link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  /* ── Progressive reveal helper ───────────────────────────── */
  const revealRows = (total: number) => {
    setVisibleCount(0);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    let i = 0;
    const step = () => {
      i++;
      setVisibleCount(i);
      if (i < total) revealTimerRef.current = setTimeout(step, REVEAL_STEP_MS);
    };
    revealTimerRef.current = setTimeout(step, 60);
  };

  /* ── Fetch FDPs ──────────────────────────────────────────── */
  const fetchFDPs = useCallback(async () => {
    const ctrl = new AbortController();
    try {
      setLoading(true);
      setError(null);
      setVisibleCount(0);
      let data: FDP[] = [];

      switch (activeTab) {
        case "pending": data = await getMyPendingFDPs(selectedRole, { signal: ctrl.signal }); break;
        case "mine":    data = await getMyFDPs({ signal: ctrl.signal }); break;
        default:        data = await getAllFDPs({ signal: ctrl.signal });
      }

      data.sort((a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime());
      setFdps(data);
      setLoading(false);
      revealRows(data.length);          // ← start progressive reveal

      if (activeTab !== "pending") {
        const pending = await getMyPendingFDPs(selectedRole, { signal: ctrl.signal });
        setPendingFdps(pending);
      } else {
        setPendingFdps(data);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
        setLoading(false);
      }
    }
    return () => { ctrl.abort(); if (revealTimerRef.current) clearTimeout(revealTimerRef.current); };
  }, [activeTab, selectedRole]);

  useEffect(() => { fetchFDPs(); }, [fetchFDPs, location.state?.refresh]);

  /* ── Helpers ─────────────────────────────────────────────── */
  const parseAmt = (v: number | string | null) => {
    if (!v) return 0;
    return typeof v === "string" ? parseFloat(v) || 0 : v;
  };
  const fmtCurrency = (v: number | string | null) => {
    const n = parseAmt(v);
    return n === 0 ? "—" : new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
  };
  const fmtRole = (r: UserRole) => {
    const m: Partial<Record<UserRole, string>> = {
      [UserRole.DEMANDEUR]: "Demandeur",
      [UserRole.CHEF_SERVICE]: "Supérieur hiérarchique",
      [UserRole.RESPONSABLE_COMPTABLE]: "Comptabilité",
      [UserRole.DIRECTEUR_GENERAL]: "Directeur Général",
      [UserRole.CAISSE]: "Caisse",
      [UserRole.ADMIN]: "Administrateur",
    };
    return m[r] ?? r.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  };

  const getStatusCfg = (s: FDPStatus) => {
    if (s === FDPStatus.COMPLETED) return { bg: "#EDFAF4", color: "#0D7A52", dot: "#10B981", label: "Validée",  border: "#A7F3D0" };
    if (s === FDPStatus.REJECTED)  return { bg: "#FFF0F0", color: "#C0162A", dot: "#EF4444", label: "Rejetée",  border: "#FECACA" };
    if (s === FDPStatus.DRAFT)     return { bg: "#F4F6FA", color: "#5A6782", dot: "#9CA3AF", label: "Brouillon",border: "#E5E7EB" };
    return { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B", label: "En cours", border: "#FDE68A" };
  };

  const initials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avatarColor = (name: string) => {
    const c = ["#2563EB","#7C3AED","#DB2777","#D97706","#059669","#DC2626","#0891B2"];
    let h = 0;
    for (const ch of name || "") h = (h + ch.charCodeAt(0)) % c.length;
    return c[h];
  };

  const filtered = searchTerm
    ? fdps.filter(
        (f) =>
          f.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : fdps;

  const totalAmt = fdps.filter((f) => f.status === FDPStatus.COMPLETED)
    .reduce((s, f) => s + (parseAmt(f.validated_amount) || parseAmt(f.amount)), 0);
  const doneCount  = fdps.filter((f) => f.status === FDPStatus.COMPLETED).length;
  const rejCount   = fdps.filter((f) => f.status === FDPStatus.REJECTED).length;
  const pending    = pendingFdps.length;
  const requesters = [...new Set(fdps.map((f) => f.requester_name))].length;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const stats = [
    { label: "Total validé",         value: fmtCurrency(totalAmt), icon: CreditCard,   accent: "#2563EB", sub: `${doneCount} fiche${doneCount>1?"s":""} validée${doneCount>1?"s":""}`, trend: "+12%" },
    { label: "Validées",             value: String(doneCount),     icon: CheckCircle,  accent: "#059669", sub: `Sur ${fdps.length} au total`,            trend: null },
    { label: "En attente (mon rôle)",value: String(pending),       icon: Clock,        accent: "#D97706", sub: pending > 0 ? "⚡ Action requise" : "Rien à faire", trend: null },
    { label: "Demandeurs actifs",    value: String(requesters),    icon: Users,        accent: "#7C3AED", sub: `${rejCount} rejetée${rejCount>1?"s":""}`, trend: null },
  ];

  /* ─────────────────────────────────────────────────────────
     TABS CONFIG
  ───────────────────────────────────────────────────────── */
  const tabs = [
    { key: "all",     label: "Toutes",     icon: Layers, count: fdps.length, alert: false },
    { key: "pending", label: "En attente", icon: Clock,  count: pending,     alert: pending > 0 },
    { key: "mine",    label: "Mes fiches", icon: Users,  count: null,        alert: false },
  ] as const;

  /* ─────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────── */
  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes spin    { to { transform: rotate(360deg) } }
    @keyframes fadeIn  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
    @keyframes shimmer { 0% { background-position:-600px 0 } 100% { background-position:600px 0 } }
    @keyframes rowIn   { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
    @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:.4 } }

    .fdp-row:hover       { background:#F5F8FF !important; }
    .fdp-row:hover .fdp-chevron { color:#2563EB !important; }
    .fdp-tab:hover       { color:#0F172A !important; background:rgba(37,99,235,0.05) !important; }
    .fdp-tab.active      { color:#2563EB !important; background:#EEF3FF !important; }
    .fdp-stat:hover      { transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,0,0,0.1) !important; }
    .fdp-btn-new:hover   { box-shadow:0 8px 28px rgba(37,99,235,0.5) !important; transform:translateY(-1px); }
    .fdp-logout:hover    { color:#EF4444 !important; background:rgba(239,68,68,0.08) !important; }
    .fdp-search:focus    { outline:none; border-color:rgba(255,255,255,0.4) !important; background:rgba(255,255,255,0.12) !important; }
    .fdp-search::placeholder { color:rgba(255,255,255,0.3); }
    .fdp-select          { appearance:none; }

    .skeleton-row td { padding:14px 16px !important; }
    .skeleton-cell   {
      height:14px; border-radius:6px;
      background:linear-gradient(90deg,#F1F5F9 25%,#E8EDF4 50%,#F1F5F9 75%);
      background-size:600px 100%;
      animation:shimmer 1.4s infinite linear;
    }
    .fdp-stat { transition:transform .2s, box-shadow .2s; }
    .fdp-row  { animation:rowIn .22s ease both; }
  `;

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily:"'Sora',system-ui,sans-serif", background:"#F0F4FB", minHeight:"100vh" }}>
      <style>{css}</style>

      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <header
        style={{
          background:"linear-gradient(140deg,#040E1F 0%,#0B1D38 50%,#0D2448 100%)",
          padding:"0 40px",
          position:"sticky", top:0, zIndex:50,
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          boxShadow:"0 4px 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Subtle grid texture */}
        <div style={{
          position:"absolute",inset:0,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize:"40px 40px",
          pointerEvents:"none",
        }}/>

        <div style={{ maxWidth:1440, margin:"0 auto", display:"flex", alignItems:"center", height:64, gap:32, position:"relative" }}>

          {/* Separator */}
          <div style={{ width:1,height:28,background:"rgba(255,255,255,0.1)",flexShrink:0 }}/>

          {/* ── TABS (navigation principale) ─────── */}
          <nav style={{ display:"flex",alignItems:"center",gap:2,flex:1 }}>
            {tabs.map(({ key, label, icon: Icon, count, alert }) => (
              <button
                key={key}
                className={`fdp-tab${activeTab === key ? " active" : ""}`}
                onClick={() => setActiveTab(key as any)}
                style={{
                  display:"flex",alignItems:"center",gap:7,
                  padding:"8px 16px",
                  border:"none",
                  borderRadius:10,
                  cursor:"pointer",
                  fontSize:13,
                  fontWeight:activeTab===key ? 700 : 500,
                  color: activeTab===key ? "#2563EB" : "rgba(255,255,255,0.5)",
                  background: activeTab===key ? "#EEF3FF" : "transparent",
                  transition:"all .15s",
                  fontFamily:"'Sora',sans-serif",
                  position:"relative",
                  whiteSpace:"nowrap",
                }}
              >
                <Icon size={14}/>
                {label}
                {count !== null && count > 0 && (
                  <span style={{
                    background: alert ? "#EF4444" : (activeTab===key ? "#2563EB" : "rgba(255,255,255,0.12)"),
                    color: "#FFF",
                    fontSize:10, fontWeight:800,
                    padding:"2px 6px", borderRadius:20,
                    minWidth:18, textAlign:"center",
                  }}>{count}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Right: search + role + new + user */}
          <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>

            {/* Search */}
            <div style={{ position:"relative" }}>
              <Search size={14} style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.35)",pointerEvents:"none" }}/>
              <input
                className="fdp-search"
                type="text"
                placeholder="Rechercher…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background:"rgba(255,255,255,0.07)",
                  border:"1px solid rgba(255,255,255,0.12)",
                  color:"#FFFFFF",
                  padding:"9px 14px 9px 32px",
                  borderRadius:10,
                  fontSize:13,
                  width:190,
                  fontFamily:"'Sora',sans-serif",
                  transition:"all .2s",
                }}
              />
            </div>

            {/* ── Role selector ── */}
            {availableRoles.length > 1 && (
              <div ref={roleDropdownRef} style={{ position:"relative" }}>
                {/* Trigger button */}
                <button
                  onClick={() => setRoleDropdownOpen((v) => !v)}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    background: roleDropdownOpen
                      ? "rgba(245,158,11,0.18)"
                      : "rgba(245,158,11,0.10)",
                    border:`1px solid ${roleDropdownOpen ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.25)"}`,
                    borderRadius:10,
                    padding:"7px 12px",
                    cursor:"pointer",
                    fontFamily:"'Sora',sans-serif",
                    transition:"all .15s",
                  }}
                >
                  {/* Left: icon + labels */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:1 }}>
                    <span style={{ color:"rgba(245,158,11,0.55)", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", lineHeight:1 }}>
                      Vue active
                    </span>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:13 }}>{ROLE_META[selectedRole]?.icon ?? "👤"}</span>
                      <span style={{ color:"#F59E0B", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
                        {fmtRole(selectedRole)}
                      </span>
                    </div>
                  </div>
                  {/* Chevron */}
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ color:"#F59E0B", transform: roleDropdownOpen ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Dropdown panel */}
                {roleDropdownOpen && (
                  <div style={{
                    position:"absolute", top:"calc(100% + 8px)", right:0,
                    background:"#FFFFFF",
                    border:"1px solid #E2E8F0",
                    borderRadius:16,
                    boxShadow:"0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                    minWidth:290,
                    overflow:"hidden",
                    zIndex:100,
                    animation:"fadeIn .15s ease both",
                  }}>
                    {/* Panel header */}
                    <div style={{ padding:"14px 18px 10px", borderBottom:"1px solid #F1F5F9" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                        <Shield size={13} color="#F59E0B"/>
                        <span style={{ fontSize:12, fontWeight:700, color:"#0A1628", letterSpacing:"-0.1px" }}>
                          Changer de vue
                        </span>
                      </div>
                      <p style={{ margin:0, fontSize:11, color:"#8896AE", lineHeight:1.5 }}>
                        Chaque vue affiche les fiches et actions correspondant à votre rôle.
                      </p>
                    </div>

                    {/* Role options */}
                    <div style={{ padding:"8px 10px" }}>
                      {availableRoles.map((r) => {
                        const meta = ROLE_META[r];
                        const isActive = r === selectedRole;
                        return (
                          <button
                            key={r}
                            onClick={() => { setSelectedRole(r); setRoleDropdownOpen(false); }}
                            style={{
                              width:"100%", textAlign:"left",
                              display:"flex", alignItems:"center", gap:12,
                              padding:"10px 12px",
                              borderRadius:10,
                              border: isActive ? `1.5px solid ${meta?.color ?? "#2563EB"}33` : "1.5px solid transparent",
                              background: isActive ? (meta?.bg ?? "#EEF3FF") : "transparent",
                              cursor:"pointer",
                              transition:"background .12s",
                              fontFamily:"'Sora',sans-serif",
                            }}
                            onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                            onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            {/* Emoji icon */}
                            <span style={{
                              fontSize:20, lineHeight:1,
                              width:38, height:38, flexShrink:0,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              background: isActive ? "rgba(255,255,255,0.7)" : "#F1F5F9",
                              borderRadius:10,
                            }}>
                              {meta?.icon ?? "👤"}
                            </span>

                            {/* Text */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{
                                  fontSize:13, fontWeight:700,
                                  color: isActive ? (meta?.color ?? "#2563EB") : "#0A1628",
                                }}>
                                  {fmtRole(r)}
                                </span>
                                {isActive && (
                                  <span style={{
                                    fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.06em",
                                    background: meta?.color ?? "#2563EB",
                                    color:"#FFF",
                                    padding:"2px 6px", borderRadius:6,
                                  }}>
                                    Actif
                                  </span>
                                )}
                              </div>
                              <p style={{ margin:0, fontSize:11, color:"#8896AE", marginTop:1, lineHeight:1.4 }}>
                                {meta?.desc ?? ""}
                              </p>
                            </div>

                            {/* Active checkmark */}
                            {isActive && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                                <circle cx="8" cy="8" r="8" fill={meta?.color ?? "#2563EB"}/>
                                <path d="M4.5 8l2.5 2.5 4-4" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer hint */}
                    <div style={{ padding:"10px 18px", borderTop:"1px solid #F1F5F9", background:"#FAFBFD", display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:10, color:"#B0BAC9" }}>
                        💡 La vue filtre les fiches et les actions disponibles selon votre rôle sélectionné.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* New FDP button */}
            {selectedRole === UserRole.DEMANDEUR && (
              <button
                onClick={() => navigate("/fdp/new")}
                className="fdp-btn-new"
                style={{
                  background:"linear-gradient(135deg,#2563EB,#1D4ED8)",
                  color:"#FFF",
                  border:"none",
                  padding:"9px 20px",
                  borderRadius:10,
                  fontSize:13,
                  fontWeight:700,
                  cursor:"pointer",
                  display:"flex",alignItems:"center",gap:7,
                  boxShadow:"0 4px 18px rgba(37,99,235,0.4)",
                  transition:"all .2s",
                  fontFamily:"'Sora',sans-serif",
                  letterSpacing:"-0.1px",
                  whiteSpace:"nowrap",
                }}
              >
                <Plus size={15}/> Nouvelle FDP
              </button>
            )}

            {/* Notif bell */}
            {pending > 0 && (
              <div style={{ position:"relative",cursor:"pointer",padding:6 }}>
                <Bell size={17} color="rgba(255,255,255,0.5)"/>
                <div style={{ position:"absolute",top:2,right:2,width:8,height:8,borderRadius:"50%",background:"#EF4444",animation:"pulse 2s infinite" }}/>
              </div>
            )}

            {/* Separator */}
            <div style={{ width:1,height:28,background:"rgba(255,255,255,0.1)" }}/>

            {/* User chip */}
            <div style={{ display:"flex",alignItems:"center",gap:9 }}>
              <div style={{
                width:32,height:32,borderRadius:"50%",
                background:avatarColor(user?.fullName||""),
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:800,color:"#FFF",flexShrink:0,
                boxShadow:`0 2px 10px ${avatarColor(user?.fullName||"")}66`,
              }}>
                {initials(user?.fullName||"")}
              </div>
              <div style={{ lineHeight:1.2 }}>
                <p style={{ margin:0,color:"rgba(255,255,255,0.85)",fontSize:12,fontWeight:600 }}>{user?.fullName}</p>
                <p style={{ margin:0,color:"rgba(255,255,255,0.35)",fontSize:10,marginTop:1 }}>{fmtRole(selectedRole)}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="fdp-logout"
              title="Déconnexion"
              style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",transition:"all .2s",padding:"6px 8px",borderRadius:8 }}
            >
              <LogOut size={15}/>
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          PAGE BODY
      ══════════════════════════════════════════ */}
      <main style={{ maxWidth:1440, margin:"0 auto", padding:"36px 40px 60px" }}>

        {/* ── Page title row ── */}
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28 }}>
          <div style={{ animation:"fadeIn .4s ease both" }}>
            <h1 style={{
              fontFamily:"'Instrument Serif',serif",
              fontSize:32, fontWeight:400,
              color:"#0A1628",
              margin:"0 0 6px",
              letterSpacing:"-0.5px",
            }}>
              Bonjour, <em style={{ color:"#2563EB", fontStyle:"italic" }}>{user?.fullName?.split(" ")[0]}</em>
            </h1>
            <p style={{ margin:0,color:"#8896AE",fontSize:13,textTransform:"capitalize",fontWeight:500 }}>{today}</p>
          </div>
          {pending > 0 && (
            <div style={{
              display:"flex",alignItems:"center",gap:8,
              background:"linear-gradient(135deg,#FFF7ED,#FEF3C7)",
              border:"1px solid #FDE68A",
              borderRadius:14,padding:"10px 18px",
              animation:"fadeIn .5s .1s ease both",
            }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#F59E0B",animation:"pulse 1.5s infinite" }}/>
              <span style={{ color:"#92400E",fontSize:13,fontWeight:700 }}>{pending} fiche{pending>1?"s":""} en attente de votre action</span>
              <ArrowUpRight size={14} color="#D97706"/>
            </div>
          )}
        </div>

        {/* ── Stats grid ── */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:18,marginBottom:28 }}>
          {stats.map(({ label, value, icon: Icon, accent, sub, trend }, idx) => (
            <div
              key={label}
              className="fdp-stat"
              style={{
                background:"#FFFFFF",
                borderRadius:18,
                padding:"22px 24px",
                boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.06)",
                border:"1px solid #E8EDF5",
                position:"relative",
                overflow:"hidden",
                animation:`fadeIn .4s ${0.05+idx*0.07}s ease both`,
              }}
            >
              {/* accent bar */}
              <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${accent},${accent}88)` }}/>
              {/* faint bg circle */}
              <div style={{ position:"absolute",bottom:-30,right:-20,width:100,height:100,borderRadius:"50%",background:accent,opacity:0.04,pointerEvents:"none" }}/>

              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
                <div>
                  <p style={{ margin:"0 0 10px",color:"#8896AE",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em" }}>{label}</p>
                  <p style={{ margin:0,color:"#0A1628",fontSize:26,fontWeight:800,letterSpacing:"-1px",lineHeight:1 }}>{value}</p>
                  <p style={{ margin:"8px 0 0",color:accent,fontSize:11,fontWeight:600 }}>{sub}</p>
                </div>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8 }}>
                  <div style={{ background:`${accent}15`,padding:10,borderRadius:12 }}>
                    <Icon size={20} color={accent}/>
                  </div>
                  {trend && (
                    <span style={{ color:"#059669",fontSize:11,fontWeight:700,background:"#EDFAF4",padding:"2px 7px",borderRadius:6 }}>
                      {trend}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main table card ── */}
        <div style={{
          background:"#FFFFFF",
          borderRadius:20,
          boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 12px 40px rgba(0,0,0,0.07)",
          border:"1px solid #E8EDF5",
          overflow:"hidden",
          animation:"fadeIn .4s .3s ease both",
        }}>

          {/* ── Card header ── */}
          <div style={{
            padding:"18px 28px",
            borderBottom:"1px solid #F0F4FB",
            display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"#FAFBFD",
          }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:loading?"#F59E0B":"#10B981",animation:loading?"pulse 1s infinite":"none" }}/>
              <span style={{ color:"#0A1628",fontSize:15,fontWeight:700 }}>
                Fiches de dépense
              </span>
              {!loading && (
                <span style={{ color:"#8896AE",fontSize:13,fontWeight:500 }}>
                  — {filtered.length} résultat{filtered.length!==1?"s":""}
                  {visibleCount < filtered.length && ` · chargement ${visibleCount}/${filtered.length}`}
                </span>
              )}
            </div>

            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <Activity size={13} color="#CBD5E1"/>
              <span style={{ color:"#CBD5E1",fontSize:12 }}>Temps réel</span>
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div style={{ margin:"16px 28px",background:"#FFF0F0",border:"1px solid #FECACA",borderRadius:12,padding:"12px 18px",display:"flex",alignItems:"center",gap:10 }}>
              <AlertCircle size={16} color="#DC2626"/>
              <span style={{ color:"#991B1B",fontSize:13 }}>{error}</span>
            </div>
          )}

          {/* ── Table / States ── */}
          <div style={{ padding:"8px 0" }}>
            {loading ? (
              /* ── SKELETON ── */
              <table style={{ width:"100%",borderCollapse:"separate",borderSpacing:0 }}>
                <thead>
                  <tr>
                    {["Référence","Date","Demandeur","Description","Montant","Statut",""].map((h) => (
                      <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#B0BAC9",textTransform:"uppercase",letterSpacing:"0.07em",background:"#FAFBFD",borderBottom:"1px solid #F0F4FB" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: skeletonRows }).map((_, i) => (
                    <tr key={i} className="skeleton-row" style={{ borderBottom:"1px solid #F8FAFC" }}>
                      <td><div className="skeleton-cell" style={{ width:80 }}/></td>
                      <td><div className="skeleton-cell" style={{ width:90 }}/></td>
                      <td>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <div className="skeleton-cell" style={{ width:34,height:34,borderRadius:"50%",flexShrink:0 }}/>
                          <div>
                            <div className="skeleton-cell" style={{ width:100,marginBottom:4 }}/>
                            <div className="skeleton-cell" style={{ width:60,height:10 }}/>
                          </div>
                        </div>
                      </td>
                      <td><div className="skeleton-cell" style={{ width:160 }}/></td>
                      <td><div className="skeleton-cell" style={{ width:100 }}/></td>
                      <td><div className="skeleton-cell" style={{ width:72,height:24,borderRadius:20 }}/></td>
                      <td><div className="skeleton-cell" style={{ width:16,height:16,borderRadius:4 }}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>

            ) : filtered.length === 0 ? (
              /* ── EMPTY ── */
              <div style={{ padding:"64px 0",textAlign:"center" }}>
                <div style={{ width:72,height:72,background:"linear-gradient(135deg,#EEF3FF,#F5F7FF)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",border:"2px solid #E2E8F0" }}>
                  <FileText size={28} color="#9BA8BF"/>
                </div>
                <h3 style={{ color:"#0A1628",fontSize:18,fontWeight:700,margin:"0 0 8px" }}>
                  {activeTab==="pending" ? "Aucune signature requise" : "Aucune fiche trouvée"}
                </h3>
                <p style={{ color:"#8896AE",fontSize:14,margin:"0 0 28px" }}>
                  {activeTab==="pending"
                    ? "Les fiches nécessitant votre signature apparaîtront ici."
                    : "Créez votre première fiche de dépense pour démarrer."}
                </p>
                {selectedRole===UserRole.DEMANDEUR && (
                  <button
                    onClick={() => navigate("/fdp/new")}
                    style={{ background:"linear-gradient(135deg,#2563EB,#1D4ED8)",color:"#FFF",border:"none",padding:"12px 28px",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 4px 14px rgba(37,99,235,0.3)",fontFamily:"'Sora',sans-serif" }}
                  >
                    <Plus size={16}/> Créer une fiche
                  </button>
                )}
              </div>

            ) : (
              /* ── TABLE ── */
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%",borderCollapse:"separate",borderSpacing:0 }}>
                  <thead>
                    <tr>
                      {["Référence","Date","Demandeur","Description","Montant","Statut",""].map((h) => (
                        <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#B0BAC9",textTransform:"uppercase",letterSpacing:"0.07em",background:"#FAFBFD",borderBottom:"1px solid #F0F4FB",whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((fdp, i) => {
                      const st = getStatusCfg(fdp.status);
                      const isVisible = i < visibleCount;
                      return (
                        <tr
                          key={fdp.id}
                          className={isVisible ? "fdp-row" : ""}
                          onClick={() => isVisible && navigate(`/fdp/${fdp.id}`,{ state:{ selectedRole } })}
                          style={{
                            cursor: isVisible ? "pointer" : "default",
                            borderBottom: i < filtered.length-1 ? "1px solid #F5F7FC" : "none",
                            transition:"background .12s",
                            opacity: isVisible ? 1 : 0,
                            animationDelay: `${i*REVEAL_STEP_MS}ms`,
                          }}
                        >
                          {/* Reference */}
                          <td style={{ padding:"14px 16px" }}>
                            <span style={{ fontWeight:700,color:"#2563EB",fontSize:12,fontFamily:"monospace",background:"#EEF3FF",padding:"3px 9px",borderRadius:7,letterSpacing:"0.02em" }}>
                              {fdp.reference}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding:"14px 16px",whiteSpace:"nowrap" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6,color:"#6B7A95",fontSize:13 }}>
                              <Calendar size={12} color="#CBD5E1"/>
                              {format(new Date(fdp.creation_date),"dd MMM yyyy",{ locale:fr })}
                            </div>
                          </td>

                          {/* Requester */}
                          <td style={{ padding:"14px 16px" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                              <div style={{ width:34,height:34,borderRadius:"50%",background:avatarColor(fdp.requester_name),display:"flex",alignItems:"center",justifyContent:"center",color:"#FFF",fontSize:11,fontWeight:800,flexShrink:0,boxShadow:`0 2px 8px ${avatarColor(fdp.requester_name)}55` }}>
                                {initials(fdp.requester_name)}
                              </div>
                              <div>
                                <p style={{ margin:0,fontSize:13,fontWeight:600,color:"#0A1628" }}>{fdp.requester_name}</p>
                                {fdp.requester_department && <p style={{ margin:0,fontSize:11,color:"#9BA8BF" }}>{fdp.requester_department}</p>}
                              </div>
                            </div>
                          </td>

                          {/* Description */}
                          <td style={{ padding:"14px 16px" }}>
                            <span title={fdp.description} style={{ color:"#5A6782",fontSize:13,display:"block",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                              {fdp.description}
                            </span>
                          </td>

                          {/* Amount */}
                          <td style={{ padding:"14px 16px",whiteSpace:"nowrap" }}>
                            <span style={{ fontWeight:800,color:"#0A1628",fontSize:14,letterSpacing:"-0.3px" }}>
                              {fmtCurrency(fdp.validated_amount || fdp.amount)}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding:"14px 16px" }}>
                            <span style={{ background:st.bg,color:st.color,border:`1px solid ${st.border}`,padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap" }}>
                              <span style={{ width:5,height:5,borderRadius:"50%",background:st.dot }}/>
                              {st.label}
                            </span>
                          </td>

                          {/* Arrow */}
                          <td style={{ padding:"14px 12px" }}>
                            <ChevronRight size={15} className="fdp-chevron" color="#D1D8E6"/>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card footer */}
          {filtered.length > 0 && !loading && (
            <div style={{ padding:"14px 28px",borderTop:"1px solid #F0F4FB",background:"#FAFBFD",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <span style={{ color:"#C8D0DC",fontSize:12 }}>
                Cliquez sur une ligne pour voir les détails
              </span>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:"#10B981" }}/>
                <span style={{ color:"#C8D0DC",fontSize:12 }}>Données actualisées en temps réel</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;