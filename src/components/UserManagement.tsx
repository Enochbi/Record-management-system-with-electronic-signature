import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  full_name: string;
}

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";

const ROLE_META: Partial<Record<string, { label: string; color: string; bg: string; border: string }>> = {
  admin:                  { label: "Administrateur",         color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  demandeur:              { label: "Demandeur",              color: "#2563EB", bg: "#EEF3FF", border: "#BFDBFE" },
  operations:             { label: "Opérations",             color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
  fournisseur:            { label: "Fournisseur",            color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
  superieur_hierarchique: { label: "Supérieur hiérarchique", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  chef_service:           { label: "Chef de service",        color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  tresorerie:             { label: "Trésorerie",             color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  comptabilite:           { label: "Comptabilité",           color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
  responsable_comptable:  { label: "Resp. comptable",        color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
  directeur_general:      { label: "Directeur Général",      color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  caisse:                 { label: "Caisse",                 color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
};

const getRoleLabel = (role: string) => ROLE_META[role]?.label ?? role;

const initials = (name: string) =>
  name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const avatarColor = (name: string) => {
  const c = ["#2563EB", "#7C3AED", "#DB2777", "#D97706", "#059669", "#DC2626", "#0891B2"];
  let h = 0;
  for (const ch of name || "") h = (h + ch.charCodeAt(0)) % c.length;
  return c[h];
};

/* ─────────────────────────────────────────────────────────── */

const UserManagement: React.FC = () => {
  const [users, setUsers]             = useState<User[]>([]);
  const [loading, setLoading]         = useState(true);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwVisible, setPwVisible]     = useState(false);
  const { user, logout, getToken }    = useAuth();
  const navigate                      = useNavigate();
  const roles                         = Object.values(UserRole);

  /* ── Fonts ── */
  useEffect(() => {
    const id = "um-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet"; link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) navigate("/dashboard");
    else fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("Session expirée, veuillez vous reconnecter");
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.status === 401) { logout(); navigate("/login"); return; }
      if (res.status === 403) { navigate("/dashboard"); return; }
      if (!res.ok) throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      setUsers(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingId(userId);
      const token = getToken();
      if (!token) { logout(); navigate("/login"); return; }
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.status === 401) { logout(); navigate("/login"); return; }
      if (!res.ok) throw new Error(`Échec de la mise à jour: ${res.status}`);
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setSuccess("Rôle mis à jour avec succès.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUpdatingId(null);
    }
  };

  const resetPassword = async () => {
    try {
      setResettingId(selectedUserId);
      setError(null);
      const token = getToken();
      if (!token) { logout(); navigate("/login"); return; }
      const res = await fetch(`/api/users/${selectedUserId}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (res.status === 401) { logout(); navigate("/login"); return; }
      if (!res.ok) throw new Error(`Échec de la réinitialisation: ${res.status}`);
      setSuccess("Mot de passe modifié avec succès.");
      setTimeout(() => setSuccess(null), 3000);
      setShowModal(false);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setResettingId(null);
    }
  };

  if (user?.role !== UserRole.ADMIN) return null;

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes fadeIn  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
    @keyframes shimmer { 0% { background-position:-600px 0 } 100% { background-position:600px 0 } }
    @keyframes rowIn   { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
    @keyframes scaleIn { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }

    .um-row:hover        { background:#F5F8FF !important; }
    .um-btn-reset:hover  { background:#EEF3FF !important; color:#1D4ED8 !important; border-color:#BFDBFE !important; }
    .um-btn-cancel:hover { background:#F1F5F9 !important; }
    .um-close:hover      { background:#F1F5F9 !important; color:#374151 !important; }
    .skeleton-cell {
      height:13px; border-radius:6px;
      background:linear-gradient(90deg,#F1F5F9 25%,#E8EDF4 50%,#F1F5F9 75%);
      background-size:600px 100%;
      animation:shimmer 1.4s infinite linear;
    }
    .um-row { animation: rowIn .2s ease both; }
  `;

  return (
    <div style={{ fontFamily:"'Sora',system-ui,sans-serif", background:"#F0F4FB", minHeight:"100vh", padding:"40px 40px 60px" }}>
      <style>{css}</style>

      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom:28, animation:"fadeIn .4s ease both" }}>
          <h1 style={{
            fontFamily:"'Instrument Serif',serif",
            fontSize:30, fontWeight:400,
            color:"#0A1628", margin:"0 0 6px",
            letterSpacing:"-0.4px",
          }}>
            Gestion des{" "}
            <em style={{ color:"#2563EB", fontStyle:"italic" }}>utilisateurs</em>
          </h1>
          <p style={{ margin:0, color:"#8896AE", fontSize:13 }}>
            Modifiez les rôles et gérez les accès de chaque membre.
          </p>
        </div>

        {/* ── Banners ── */}
        {error && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#FFF0F0", border:"1px solid #FECACA", borderRadius:12, padding:"12px 18px", marginBottom:18, animation:"fadeIn .2s ease" }}>
            <span style={{ color:"#C0162A", fontSize:13, fontWeight:500 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#C0162A", fontSize:18, fontWeight:700, lineHeight:1, padding:"0 4px" }}>×</button>
          </div>
        )}
        {success && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#EDFAF4", border:"1px solid #A7F3D0", borderRadius:12, padding:"12px 18px", marginBottom:18, animation:"fadeIn .2s ease" }}>
            <span style={{ color:"#0D7A52", fontSize:13, fontWeight:500 }}>{success}</span>
            <button onClick={() => setSuccess(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#0D7A52", fontSize:18, fontWeight:700, lineHeight:1, padding:"0 4px" }}>×</button>
          </div>
        )}

        {/* ── Main card ── */}
        <div style={{
          background:"#FFFFFF",
          borderRadius:20,
          boxShadow:"0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)",
          border:"1px solid #E8EDF5",
          overflow:"hidden",
          animation:"fadeIn .4s .1s ease both",
        }}>
          {/* Card header */}
          <div style={{ padding:"18px 28px", borderBottom:"1px solid #F0F4FB", background:"#FAFBFD", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:14, fontWeight:700, color:"#0A1628" }}>Liste des comptes</span>
            {!loading && (
              <span style={{ fontSize:12, color:"#8896AE", fontWeight:500 }}>
                {users.length} utilisateur{users.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
              <thead>
                <tr>
                  {["Utilisateur", "Email", "Rôle", "Actions"].map((h) => (
                    <th key={h} style={{ padding:"11px 20px", textAlign:"left", fontSize:11, fontWeight:700, color:"#B0BAC9", textTransform:"uppercase", letterSpacing:"0.07em", background:"#FAFBFD", borderBottom:"1px solid #F0F4FB", whiteSpace:"nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom:"1px solid #F5F7FC" }}>
                        <td style={{ padding:"16px 20px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <div className="skeleton-cell" style={{ width:36, height:36, borderRadius:"50%", flexShrink:0 }}/>
                            <div>
                              <div className="skeleton-cell" style={{ width:110, marginBottom:5 }}/>
                              <div className="skeleton-cell" style={{ width:70, height:10 }}/>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:"16px 20px" }}><div className="skeleton-cell" style={{ width:160 }}/></td>
                        <td style={{ padding:"16px 20px" }}><div className="skeleton-cell" style={{ width:120, height:26, borderRadius:20 }}/></td>
                        <td style={{ padding:"16px 20px" }}><div className="skeleton-cell" style={{ width:110, height:30, borderRadius:8 }}/></td>
                      </tr>
                    ))
                  : users.map((u, i) => {
                      const meta = ROLE_META[u.role] ?? { color:"#6B7280", bg:"#F9FAFB", border:"#E5E7EB", label: u.role };
                      const isUpdating = updatingId === u.id;
                      return (
                        <tr
                          key={u.id}
                          className="um-row"
                          style={{
                            borderBottom: i < users.length - 1 ? "1px solid #F5F7FC" : "none",
                            transition:"background .12s",
                            animationDelay:`${i * 40}ms`,
                          }}
                        >
                          {/* User */}
                          <td style={{ padding:"14px 20px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <div style={{
                                width:36, height:36, borderRadius:"50%",
                                background: avatarColor(u.full_name),
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:11, fontWeight:800, color:"#FFF", flexShrink:0,
                                boxShadow:`0 2px 8px ${avatarColor(u.full_name)}55`,
                              }}>
                                {initials(u.full_name)}
                              </div>
                              <div>
                                <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#0A1628" }}>{u.full_name}</p>
                                <p style={{ margin:0, fontSize:11, color:"#9BA8BF", marginTop:1 }}>@{u.username}</p>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td style={{ padding:"14px 20px" }}>
                            <span style={{ fontSize:13, color:"#5A6782" }}>{u.email}</span>
                          </td>

                          {/* Role */}
                          <td style={{ padding:"14px 20px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <select
                                value={u.role}
                                disabled={isUpdating}
                                onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                style={{
                                  appearance:"none",
                                  background: meta.bg,
                                  border:`1.5px solid ${meta.border}`,
                                  color: meta.color,
                                  padding:"5px 12px",
                                  borderRadius:20,
                                  fontSize:12,
                                  fontWeight:700,
                                  cursor: isUpdating ? "not-allowed" : "pointer",
                                  fontFamily:"'Sora',sans-serif",
                                  opacity: isUpdating ? 0.5 : 1,
                                  outline:"none",
                                  transition:"border-color .2s, box-shadow .2s",
                                }}
                                onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${meta.color}22`; }}
                                onBlur={(e)  => { e.currentTarget.style.boxShadow = "none"; }}
                              >
                                {roles.map((r) => (
                                  <option key={r} value={r} style={{ background:"#1E293B", color:"#FFF" }}>
                                    {getRoleLabel(r)}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && (
                                <span style={{ fontSize:11, color:"#2563EB", fontWeight:600 }}>Mise à jour…</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ padding:"14px 20px" }}>
                            <button
                              className="um-btn-reset"
                              onClick={() => { setSelectedUserId(u.id); setShowModal(true); }}
                              style={{
                                background:"#F5F7FC",
                                border:"1px solid #E2E8F0",
                                color:"#374151",
                                padding:"7px 16px",
                                borderRadius:9,
                                fontSize:12,
                                fontWeight:600,
                                cursor:"pointer",
                                fontFamily:"'Sora',sans-serif",
                                transition:"all .15s",
                                whiteSpace:"nowrap",
                              }}
                            >
                              Réinitialiser MDP
                            </button>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MODAL
      ══════════════════════════════════════════ */}
      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setNewPassword(""); } }}
          style={{ position:"fixed", inset:0, background:"rgba(4,14,31,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, zIndex:200, backdropFilter:"blur(3px)" }}
        >
          <div style={{
            background:"#FFFFFF",
            borderRadius:20,
            boxShadow:"0 24px 80px rgba(0,0,0,0.2)",
            width:"100%", maxWidth:420,
            overflow:"hidden",
            animation:"scaleIn .18s ease both",
          }}>
            {/* Header */}
            <div style={{ padding:"22px 26px 18px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div style={{ flex:1 }}>
                <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:"#0A1628" }}>
                  Réinitialiser le mot de passe
                </h3>
                <p style={{ margin:"4px 0 12px", fontSize:12, color:"#8896AE" }}>
                  Le nouveau mot de passe sera actif immédiatement.
                </p>
                {/* User indicator */}
                {(() => {
                  const target = users.find((u) => u.id === selectedUserId);
                  if (!target) return null;
                  const meta = ROLE_META[target.role] ?? { color:"#6B7280", bg:"#F9FAFB", border:"#E5E7EB", label: target.role };
                  return (
                    <div style={{
                      display:"inline-flex", alignItems:"center", gap:10,
                      background:"#F5F7FC",
                      border:"1px solid #E2E8F0",
                      borderRadius:12,
                      padding:"8px 14px 8px 8px",
                    }}>
                      <div style={{
                        width:32, height:32, borderRadius:"50%",
                        background: avatarColor(target.full_name),
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:800, color:"#FFF", flexShrink:0,
                        boxShadow:`0 2px 6px ${avatarColor(target.full_name)}55`,
                      }}>
                        {initials(target.full_name)}
                      </div>
                      <div style={{ lineHeight:1.3 }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#0A1628" }}>
                          {target.full_name}
                        </p>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                          <span style={{ fontSize:11, color:"#8896AE" }}>@{target.username}</span>
                          <span style={{ width:3, height:3, borderRadius:"50%", background:"#CBD5E1", display:"inline-block" }}/>
                          <span style={{
                            fontSize:10, fontWeight:700,
                            color: meta.color,
                            background: meta.bg,
                            border:`1px solid ${meta.border}`,
                            padding:"1px 7px", borderRadius:10,
                          }}>
                            {getRoleLabel(target.role)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button
                className="um-close"
                onClick={() => { setShowModal(false); setNewPassword(""); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#B0BAC9", fontSize:20, fontWeight:400, lineHeight:1, padding:"2px 7px", borderRadius:8, transition:"all .15s", marginLeft:12 }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding:"22px 26px" }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#374151", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>
                Nouveau mot de passe
              </label>
              <div style={{ position:"relative" }}>
                <input
                  type={pwVisible ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newPassword) resetPassword(); }}
                  placeholder="Saisir le nouveau mot de passe"
                  style={{
                    width:"100%",
                    padding:"11px 52px 11px 14px",
                    border:"1.5px solid #E2E8F0",
                    borderRadius:12,
                    fontSize:13,
                    color:"#0A1628",
                    fontFamily:"'Sora',sans-serif",
                    outline:"none",
                    background: newPassword ? "#FAFBFF" : "#FAFBFC",
                    transition:"border-color .2s, box-shadow .2s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  onClick={() => setPwVisible((v) => !v)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9BA8BF", fontSize:11, fontWeight:700, fontFamily:"'Sora',sans-serif", padding:"2px 4px" }}
                >
                  {pwVisible ? "Cacher" : "Voir"}
                </button>
              </div>

              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex", gap:4, marginBottom:5 }}>
                    {[1,2,3].map((n) => (
                      <div key={n} style={{
                        flex:1, height:3, borderRadius:3,
                        background: newPassword.length >= n * 4
                          ? (n === 1 ? "#EF4444" : n === 2 ? "#F59E0B" : "#10B981")
                          : "#E2E8F0",
                        transition:"background .2s",
                      }}/>
                    ))}
                  </div>
                  <p style={{ margin:0, fontSize:11, fontWeight:600,
                    color: newPassword.length < 4 ? "#DC2626" : newPassword.length < 8 ? "#D97706" : "#059669",
                  }}>
                    {newPassword.length < 4 ? "Trop court" : newPassword.length < 8 ? "Résistance moyenne" : "Mot de passe solide"}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:"0 26px 22px", display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button
                className="um-btn-cancel"
                onClick={() => { setShowModal(false); setNewPassword(""); }}
                style={{ padding:"10px 20px", borderRadius:10, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#5A6782", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Sora',sans-serif", transition:"background .15s" }}
              >
                Annuler
              </button>
              <button
                onClick={resetPassword}
                disabled={!newPassword || resettingId !== null}
                style={{
                  padding:"10px 24px", borderRadius:10, border:"none",
                  background: !newPassword || resettingId !== null
                    ? "#E2E8F0"
                    : "linear-gradient(135deg,#2563EB,#1D4ED8)",
                  color: !newPassword || resettingId !== null ? "#9BA8BF" : "#FFFFFF",
                  fontSize:13, fontWeight:700,
                  cursor: !newPassword || resettingId !== null ? "not-allowed" : "pointer",
                  fontFamily:"'Sora',sans-serif",
                  boxShadow: !newPassword || resettingId !== null ? "none" : "0 4px 14px rgba(37,99,235,0.3)",
                  transition:"all .15s",
                }}
              >
                {resettingId ? "Enregistrement…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;