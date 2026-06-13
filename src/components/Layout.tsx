import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home, FileText, LogOut, Menu, X,
  Users, Zap,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";

const getRoleName = (role: string): string => {
  const map: Record<string, string> = {
    admin: "Administrateur",
    demandeur: "Demandeur",
    operations: "Opérations",
    fournisseur: "Fournisseur",
    superieur_hierarchique: "Supérieur hiérarchique",
    tresorerie: "Trésorerie",
    comptabilite: "Comptabilité",
    directeur_general: "Directeur Général",
    caisse: "Caisse",
    chef_service: "Chef de service",
    responsable_comptable: "Responsable comptable",
  };
  return map[role] ?? role;
};

const getRoleIcon = (role: string): string => {
  const map: Record<string, string> = {
    admin: "⚙️", demandeur: "✏️", operations: "🔧",
    fournisseur: "📦", superieur_hierarchique: "👔",
    tresorerie: "💰", comptabilite: "📊",
    directeur_general: "🏛️", caisse: "💳",
    chef_service: "👔", responsable_comptable: "📊",
  };
  return map[role] ?? "👤";
};

const getRoleColor = (role: string): { color: string; bg: string } => {
  const map: Record<string, { color: string; bg: string }> = {
    admin:                   { color: "#DC2626", bg: "#FEF2F2" },
    demandeur:               { color: "#2563EB", bg: "#EEF3FF" },
    operations:              { color: "#0891B2", bg: "#ECFEFF" },
    superieur_hierarchique:  { color: "#7C3AED", bg: "#F5F3FF" },
    chef_service:            { color: "#7C3AED", bg: "#F5F3FF" },
    tresorerie:              { color: "#D97706", bg: "#FFFBEB" },
    comptabilite:            { color: "#0891B2", bg: "#ECFEFF" },
    responsable_comptable:   { color: "#0891B2", bg: "#ECFEFF" },
    directeur_general:       { color: "#D97706", bg: "#FFFBEB" },
    caisse:                  { color: "#059669", bg: "#ECFDF5" },
  };
  return map[role] ?? { color: "#2563EB", bg: "#EEF3FF" };
};

const initials = (name: string) =>
  name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const avatarColor = (name: string) => {
  const c = ["#2563EB","#7C3AED","#DB2777","#D97706","#059669","#DC2626","#0891B2"];
  let h = 0;
  for (const ch of name || "") h = (h + ch.charCodeAt(0)) % c.length;
  return c[h];
};

/* ─────────────────────────────────────────────────────────── */

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen,  setMobileOpen]  = useState(false);

  /* ── Inject fonts ── */
  useEffect(() => {
    const id = "layout-fonts-v2";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet"; link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  const isActive = (path: string) => location.pathname === path;

  /* ── Nav links config ── */
  const navLinks = [
    { to: "/dashboard", label: "Tableau de bord", icon: Home },
    ...(user?.role === "admin"
      ? [{ to: "/admin/users", label: "Gestion utilisateurs", icon: Users }]
      : []),
  ];

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes fadeDown { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIn   { from { opacity:0; transform:translateY(6px)  } to { opacity:1; transform:translateY(0) } }
    @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }

    .lyt-navlink       { transition: background .15s, color .15s; }
    .lyt-navlink:hover { background: rgba(255,255,255,0.09) !important; color:#FFF !important; }
    .lyt-mobile-link:hover { background:#F5F8FF !important; }
    .lyt-logout:hover  { background:#FEF2F2 !important; color:#DC2626 !important; }
  `;

  if (!user) return <>{children}</>;

  return (
    <div style={{ fontFamily:"'Sora',system-ui,sans-serif", background:"#F0F4FB", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <style>{css}</style>

      {/* ══════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════ */}
      <header style={{
        background: "linear-gradient(140deg,#040E1F 0%,#0B1D38 50%,#0D2448 100%)",
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
      }}>
        {/* Grid texture */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
          backgroundSize:"40px 40px", pointerEvents:"none",
        }}/>

        <div style={{ maxWidth:1440, margin:"0 auto", padding:"0 32px", display:"flex", alignItems:"center", height:62, gap:0, position:"relative" }}>

          {/* ── Brand ── */}
          <Link to="/dashboard" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", flexShrink:0, marginRight:32 }}>
            <div style={{
              width:34, height:34, borderRadius:10,
              background:"linear-gradient(135deg,#2563EB,#7C3AED)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 0 18px rgba(37,99,235,0.45)",
              flexShrink:0,
            }}>
              <Zap size={17} color="#FFF" fill="#FFF"/>
            </div>
            <div style={{ lineHeight:1.2 }}>
              <span style={{ color:"#FFFFFF", fontSize:14, fontWeight:700, letterSpacing:"-0.2px", display:"block" }}>
                Vipnet
              </span>
              <span style={{ color:"rgba(255,255,255,0.32)", fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:500 }}>
                Gestion des fiches
              </span>
            </div>
          </Link>

          {/* Separator */}
          <div style={{ width:1, height:28, background:"rgba(255,255,255,0.1)", flexShrink:0, marginRight:28 }}/>

          {/* ── Nav links ── */}
          <nav style={{ display:"flex", alignItems:"center", gap:2, flex:1 }} className="desktop-nav">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className="lyt-navlink"
                  style={{
                    display:"flex", alignItems:"center", gap:7,
                    padding:"8px 16px",
                    borderRadius:10,
                    textDecoration:"none",
                    fontSize:13, fontWeight: active ? 700 : 500,
                    color: active ? "#FFFFFF" : "rgba(255,255,255,0.48)",
                    background: active ? "rgba(37,99,235,0.28)" : "transparent",
                    border: active ? "1px solid rgba(37,99,235,0.4)" : "1px solid transparent",
                    whiteSpace:"nowrap",
                  }}
                >
                  <Icon size={14}/>
                  {label}
                  {active && (
                    <span style={{ width:5, height:5, borderRadius:"50%", background:"#60A5FA", marginLeft:2 }}/>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Right zone ── */}
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              style={{
                background:"rgba(255,255,255,0.07)",
                border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:10, padding:8, cursor:"pointer",
                color:"rgba(255,255,255,0.6)",
                display:"flex", alignItems:"center",
              }}
            >
              {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>

        {/* ── Mobile nav ── */}
        {mobileOpen && (
          <div style={{
            borderTop:"1px solid rgba(255,255,255,0.07)",
            background:"rgba(4,14,31,0.98)",
            padding:"16px 24px",
            animation:"fadeIn .18s ease both",
          }}>
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="lyt-mobile-link"
                onClick={() => setMobileOpen(false)}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"12px 14px", borderRadius:12,
                  textDecoration:"none",
                  color: isActive(to) ? "#60A5FA" : "rgba(255,255,255,0.6)",
                  background: isActive(to) ? "rgba(37,99,235,0.15)" : "transparent",
                  fontSize:14, fontWeight: isActive(to) ? 700 : 500,
                  marginBottom:4,
                  transition:"background .12s",
                }}
              >
                <Icon size={16}/> {label}
              </Link>
            ))}

            <div style={{ margin:"14px 0", height:1, background:"rgba(255,255,255,0.07)" }}/>

            {/* User info in mobile */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:12, marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:avatarColor(user.fullName), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#FFF" }}>
                {initials(user.fullName)}
              </div>
              <div>
                <p style={{ margin:0, color:"rgba(255,255,255,0.85)", fontSize:13, fontWeight:600 }}>{user.fullName}</p>
                <p style={{ margin:0, color:"rgba(255,255,255,0.32)", fontSize:11 }}>{getRoleIcon(user.role)} {getRoleName(user.role)}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width:"100%", textAlign:"left",
                display:"flex", alignItems:"center", gap:10,
                padding:"12px 14px", borderRadius:12,
                border:"none", background:"rgba(239,68,68,0.08)",
                cursor:"pointer", fontSize:14, fontWeight:500,
                color:"#FCA5A5", fontFamily:"'Sora',sans-serif",
              }}
            >
              <LogOut size={16}/> Se déconnecter
            </button>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════
          MAIN
      ══════════════════════════════════════════════ */}
      <main style={{ flex:1 }}>{children}</main>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer style={{
        background:"linear-gradient(140deg,#040E1F,#0B1D38)",
        borderTop:"1px solid rgba(255,255,255,0.06)",
        padding:"18px 40px",
      }}>
        <div style={{ maxWidth:1440, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:20, height:20, borderRadius:6, background:"linear-gradient(135deg,#2563EB,#7C3AED)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Zap size={10} color="#FFF" fill="#FFF"/>
            </div>
            <span style={{ color:"rgba(255,255,255,0.25)", fontSize:12, fontWeight:500 }}>
              Vipnet · Système de Gestion des Fiches
            </span>
          </div>
          <span style={{ color:"rgba(255,255,255,0.18)", fontSize:11 }}>
            © {new Date().getFullYear()} Vipnet — Tous droits réservés
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;