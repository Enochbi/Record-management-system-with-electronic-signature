import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";
import SignatureCanvas from "./SignatureCanvas";
import PrintableFDP from "./PrintableFDP";
import { FDP, PaymentMethod, FDPStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { createFDP, updateFDP, getFDP } from "../api";
import {
  ChevronRight, ChevronLeft, FileText, Map, CreditCard as CreditCardIcon,
  PenTool, CheckCircle, AlertCircle, Lock, Info, ArrowLeft,
  Eye, Send,
} from "lucide-react";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap";

interface FDPFormProps {
  isEditing?: boolean;
}

const STEPS = [
  { id: 1, key: "identification", label: "Identification", icon: FileText,    desc: "Type et objet" },
  { id: 2, key: "departements",   label: "Départements",   icon: Map,          desc: "Source & destination" },
  { id: 3, key: "paiement",       label: "Paiement",       icon: CreditCardIcon, desc: "Montant & mode" },
  { id: 4, key: "signature",      label: "Signature",      icon: PenTool,      desc: "Validation finale" },
];

const DEPARTMENTS = [
  "Direction Générale","Technique","Commercial",
  "Opérations","Comptabilité","Administration","Autres",
];

const TYPE_OPTIONS = [
  { value: "Expression de besoin + Demande de paiement", desc: "Demande nécessitant approbation et paiement" },
  { value: "Expression de besoin",                       desc: "Approbation sans paiement immédiat" },
  { value: "Autres",                                     desc: "Tout autre type de demande" },
];

const PAYMENT_OPTIONS = [
  { value: PaymentMethod.VIREMENT,             label: "Virement bancaire",   emoji: "🏦" },
  { value: PaymentMethod.CHEQUE_BARRE,         label: "Chèque barré",        emoji: "📄" },
  { value: PaymentMethod.CHEQUE_NON_BARRE,     label: "Chèque non barré",    emoji: "📝" },
  { value: PaymentMethod.ESPECES,              label: "Espèces",             emoji: "💵" },
  { value: PaymentMethod.MONNAIE_ELECTRONIQUE, label: "Monnaie électronique",emoji: "📱" },
  { value: PaymentMethod.AUTRE,                label: "Autre",               emoji: "🔄" },
];

const CSS = `
  @keyframes spin   { to { transform: rotate(360deg) } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
  .fdp-form-step   { animation: fadeUp 0.3s ease both; }
  .fdp-input:focus { border-color:#1D4ED8 !important; box-shadow:0 0 0 3px rgba(29,78,216,0.1) !important; outline:none; }
  .fdp-input::placeholder { color:#9CA3AF; }
  .fdp-btn-primary:hover  { opacity:0.92; transform:translateY(-1px); }
  .fdp-btn-primary:active { transform:translateY(0); }
  .fdp-btn-secondary:hover { border-color:#CBD5E1 !important; color:#0F172A !important; }
  .fdp-radio-card:hover   { border-color:#93C5FD !important; background:#F8FBFF !important; }
  .fdp-check-card:hover   { border-color:#93C5FD !important; background:#F8FBFF !important; }
  select option { background:#1E293B; color:#FFF; }
`;

const FDPForm: React.FC<FDPFormProps> = ({ isEditing = false }) => {
  const { id }      = useParams<{ id?: string }>();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const printRef    = useRef<HTMLDivElement>(null);

  const [step, setStep]           = useState(1);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const {
    register, handleSubmit, watch, reset, trigger,
    formState: { errors },
  } = useForm<Partial<FDP>>({
    defaultValues: {
      creation_date:      format(new Date(), "yyyy-MM-dd"),
      payment_method:     PaymentMethod.VIREMENT,
      department_source:  user?.department || "Direction Générale",
      department_destination: [],
      amount:             null,
    },
  });

  const form         = watch();
  const creationDate = form.creation_date ? new Date(form.creation_date) : new Date();

  // ── Inject fonts ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fid = "fdp-form-fonts";
    if (!document.getElementById(fid)) {
      const link = document.createElement("link");
      link.id = fid; link.rel = "stylesheet"; link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  // ── Load existing FDP if editing ──────────────────────────────────────────
  useEffect(() => {
    if (isEditing && id) {
      getFDP(parseInt(id))
        .then((data) => { reset(data); setSignature(data.requester_signature ?? null); })
        .catch(() => setError("Erreur lors du chargement de la fiche"));
    }
  }, [id, isEditing, reset]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `@page { size:A4; margin:5mm; } @media print { html,body { zoom:0.9; } }`,
  });

  // ── Step validation ───────────────────────────────────────────────────────
  const validateStep = async (s: number): Promise<boolean> => {
    switch (s) {
      case 1: return await trigger(["type_description", "creation_date", "description"]);
      case 2: return await trigger(["department_source"]);
      case 3: return await trigger(["payment_method"]);
      case 4: return !!signature;
      default: return true;
    }
  };

  const goNext = async () => {
    const ok = await validateStep(step);
    if (ok) setStep((s) => Math.min(s + 1, 4));
  };
  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: Partial<FDP>) => {
    if (!user || !signature) return;
    setLoading(true);
    setError(null);
    try {
      const payload: Partial<FDP> = {
        ...data,
        requester_id:               user.id,
        requester_name:             user.fullName,
        requester_position:         user.position,
        requester_department:       user.department,
        requester_phone:            user.phoneNumber,
        requester_email:            user.email,
        requester_signature:        signature,
        requester_signature_date:   format(new Date(), "yyyy-MM-dd"),
        status: isEditing ? data.status : FDPStatus.PENDING_CHEF_SERVICE,
      };
      if (isEditing && id) {
        await updateFDP(parseInt(id), payload);
        navigate(`/fdp/${id}`);
      } else {
        const newFdp = await createFDP(payload);
        navigate(`/fdp/${newFdp.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const inputCls: React.CSSProperties = {
    width: "100%", padding: "11px 14px",
    border: "1.5px solid #E2E8F0", borderRadius: 10,
    fontSize: 14, color: "#0F172A", background: "#FFFFFF",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const labelCls: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 7,
  };
  const cardCls: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: 18,
    padding: "28px 32px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.06)",
    border: "1px solid rgba(226,232,240,0.7)",
    marginBottom: 20,
  };
  const errTxt: React.CSSProperties = {
    color: "#EF4444", fontSize: 12, marginTop: 5,
  };
  const sectionHdr = (title: string, sub?: string) => (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );

  const WORKFLOW_STEPS = [
    "Supérieur hiérarchique", "Comptabilité", "Directeur Général", "Caisse",
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#EEF2F7", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* ══════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "linear-gradient(135deg, #071526 0%, #0D2645 45%, #132B4E 100%)",
          padding: "24px 40px 36px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(29,78,216,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Back link */}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
          >
            <ArrowLeft size={14} /> Retour au dashboard
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 8px rgba(245,158,11,0.5)" }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Vipnet · Nouvelle fiche
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#FFFFFF", fontSize: 28, fontWeight: 400, margin: "0 0 6px",
            }}
          >
            {isEditing ? "Modifier la fiche" : "Nouvelle fiche de dépense"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: 13 }}>
            Signé par{" "}
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              {user?.fullName}
            </span>{" "}
            · {user?.position} · {user?.department}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px 48px" }}>

        {/* ── Progress steps ── */}
        <div style={{ ...cardCls, padding: "24px 32px" }}>
          <div style={{ position: "relative" }}>
            {/* Line track */}
            <div style={{ position: "absolute", top: 20, left: "10%", right: "10%", height: 2, background: "#F1F5F9", zIndex: 0 }} />
            {/* Line fill */}
            <div
              style={{
                position: "absolute", top: 20, left: "10%", height: 2,
                background: "linear-gradient(90deg, #1D4ED8, #3B82F6)",
                width: `${((step - 1) / 3) * 80}%`,
                transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
                zIndex: 1,
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-around", position: "relative", zIndex: 2 }}>
              {STEPS.map((s) => {
                const done   = s.id < step;
                const active = s.id === step;
                const Icon   = s.icon;
                return (
                  <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: done ? "linear-gradient(135deg,#059669,#10B981)" : active ? "linear-gradient(135deg,#1D4ED8,#2563EB)" : "#F1F5F9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: active ? "0 0 0 5px rgba(29,78,216,0.15), 0 4px 12px rgba(29,78,216,0.3)" : done ? "0 2px 8px rgba(5,150,105,0.3)" : "none",
                        transition: "all 0.35s",
                      }}
                    >
                      {done ? (
                        <CheckCircle size={20} color="#FFF" />
                      ) : (
                        <Icon size={17} color={active ? "#FFF" : "#CBD5E1"} />
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: active ? 800 : done ? 700 : 500, color: active ? "#1D4ED8" : done ? "#059669" : "#9CA3AF", letterSpacing: "0.01em" }}>
                        {s.label}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: active ? "#64748B" : "#CBD5E1", marginTop: 2 }}>
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            FORM
        ════════════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ──────────────────────────────────────────────────────────────
              STEP 1 — Identification
          ────────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="fdp-form-step">
              <div style={cardCls}>
                {sectionHdr("Identification", "Renseignez le type et l'objet de votre demande")}

                {/* Type radio cards */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelCls}>
                    Type de fiche <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {TYPE_OPTIONS.map((opt) => {
                      const sel = form.type_description === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className="fdp-radio-card"
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 14,
                            padding: "14px 18px",
                            border: `1.5px solid ${sel ? "#1D4ED8" : "#E2E8F0"}`,
                            borderRadius: 12, cursor: "pointer",
                            background: sel ? "#EFF6FF" : "#FAFBFC",
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="radio" value={opt.value}
                            {...register("type_description", { required: "Sélectionnez un type" })}
                            style={{ marginTop: 3, accentColor: "#1D4ED8", width: 16, height: 16 }}
                          />
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: sel ? "#1D4ED8" : "#0F172A" }}>
                              {opt.value}
                            </p>
                            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748B" }}>
                              {opt.desc}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.type_description && <p style={errTxt}>{errors.type_description.message}</p>}
                </div>

                {/* Date + Description */}
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
                  <div>
                    <label style={labelCls}>
                      Date <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="fdp-input"
                      {...register("creation_date", { required: "La date est requise" })}
                      style={{ ...inputCls, borderColor: errors.creation_date ? "#EF4444" : "#E2E8F0" }}
                    />
                    {errors.creation_date && <p style={errTxt}>{errors.creation_date.message}</p>}
                  </div>
                  <div>
                    <label style={labelCls}>
                      Objet / Description <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="fdp-input"
                      placeholder="Décrivez brièvement l'objet de la demande…"
                      {...register("description", {
                        required: "La description est requise",
                        minLength: { value: 5, message: "Minimum 5 caractères" },
                      })}
                      style={{ ...inputCls, borderColor: errors.description ? "#EF4444" : "#E2E8F0" }}
                    />
                    {errors.description && <p style={errTxt}>{errors.description.message}</p>}
                  </div>
                </div>
              </div>

              {/* Demandeur info (read-only) */}
              <div style={{ ...cardCls, background: "#F8FAFC" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "6px 8px" }}>
                    <Lock size={14} color="#1D4ED8" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>
                      Informations du demandeur
                    </h3>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                      Remplies automatiquement depuis votre profil
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {[
                    { label: "Nom complet",   v: user?.fullName },
                    { label: "Poste",         v: user?.position },
                    { label: "Département",   v: user?.department },
                    { label: "Email",         v: user?.email },
                    { label: "Téléphone",     v: user?.phoneNumber || "Non renseigné" },
                  ].map(({ label, v }) => (
                    <div
                      key={label}
                      style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: 10, border: "1px solid #E2E8F0" }}
                    >
                      <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 5px" }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, margin: 0 }}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────
              STEP 2 — Départements
          ────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="fdp-form-step">
              <div style={cardCls}>
                {sectionHdr("Départements", "Précisez les directions concernées par cette demande")}

                {/* Source */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelCls}>
                    Département demandeur (source) <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    className="fdp-input"
                    {...register("department_source", { required: "Sélectionnez un département" })}
                    style={{
                      ...inputCls,
                      cursor: "pointer",
                      borderColor: errors.department_source ? "#EF4444" : "#E2E8F0",
                    }}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {errors.department_source && <p style={errTxt}>{errors.department_source.message}</p>}
                </div>

                {/* Destination checkboxes */}
                <div>
                  <label style={labelCls}>
                    Département(s) destinataire(s){" "}
                    <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>
                      (sélection multiple possible)
                    </span>
                  </label>
                  <div
                    style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}
                  >
                    {DEPARTMENTS.map((dept) => {
                      const checked = (form.department_destination || []).includes(dept);
                      return (
                        <label
                          key={dept}
                          className="fdp-check-card"
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "13px 16px",
                            border: `1.5px solid ${checked ? "#1D4ED8" : "#E2E8F0"}`,
                            borderRadius: 10, cursor: "pointer",
                            background: checked ? "#EFF6FF" : "#FAFBFC",
                            transition: "all 0.15s",
                            fontSize: 13, fontWeight: checked ? 700 : 400,
                            color: checked ? "#1D4ED8" : "#374151",
                          }}
                        >
                          <input
                            type="checkbox" value={dept}
                            {...register("department_destination")}
                            style={{ accentColor: "#1D4ED8", width: 16, height: 16, flexShrink: 0 }}
                          />
                          {dept}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────
              STEP 3 — Paiement
          ────────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="fdp-form-step">
              <div style={cardCls}>
                {sectionHdr("Montant & Mode de paiement", "Informations financières liées à la demande")}

                {/* Montant */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelCls}>
                    Montant demandé{" "}
                    <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>
                      (optionnel — sera validé par le Directeur Général)
                    </span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      className="fdp-input"
                      placeholder="Ex : 250 000"
                      step="1" min="0"
                      {...register("amount", {
                        valueAsNumber: true,
                        min: { value: 0, message: "Le montant doit être positif" },
                      })}
                      style={{ ...inputCls, paddingRight: 70, borderColor: errors.amount ? "#EF4444" : "#E2E8F0" }}
                    />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 12, fontWeight: 700, pointerEvents: "none" }}>
                      FCFA
                    </span>
                  </div>
                  {errors.amount && <p style={errTxt}>{errors.amount.message}</p>}
                </div>

                {/* Mode de paiement */}
                <div style={{ marginBottom: 22 }}>
                  <label style={labelCls}>
                    Mode de paiement <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {PAYMENT_OPTIONS.map(({ value, label, emoji }) => {
                      const sel = form.payment_method === value;
                      return (
                        <label
                          key={value}
                          className="fdp-radio-card"
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "13px 16px",
                            border: `1.5px solid ${sel ? "#1D4ED8" : "#E2E8F0"}`,
                            borderRadius: 10, cursor: "pointer",
                            background: sel ? "#EFF6FF" : "#FAFBFC",
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="radio" value={value}
                            {...register("payment_method", { required: "Sélectionnez un mode" })}
                            style={{ accentColor: "#1D4ED8" }}
                          />
                          <span style={{ fontSize: 18 }}>{emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: sel ? 700 : 400, color: sel ? "#1D4ED8" : "#374151" }}>
                            {label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.payment_method && <p style={errTxt}>{errors.payment_method.message}</p>}
                </div>

                {/* Référence */}
                <div>
                  <label style={labelCls}>
                    Référence de paiement{" "}
                    <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>
                      (N° facture, bon de commande…)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="fdp-input"
                    placeholder="Ex : FAC-2025-0042"
                    {...register("payment_reference")}
                    style={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────
              STEP 4 — Signature + Récapitulatif
          ────────────────────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="fdp-form-step">
              {/* Summary card */}
              <div style={{ ...cardCls, background: "#F8FAFC" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "6px 8px" }}>
                    <Eye size={14} color="#059669" />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                    Récapitulatif de la demande
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { k: "Type de fiche",    v: form.type_description || "—" },
                    { k: "Date",             v: form.creation_date ? format(new Date(form.creation_date), "dd MMMM yyyy", { locale: fr }) : "—" },
                    { k: "Objet",            v: form.description || "—" },
                    { k: "Dép. source",      v: form.department_source || "—" },
                    { k: "Montant",          v: form.amount ? `${Number(form.amount).toLocaleString("fr-FR")} FCFA` : "Non spécifié" },
                    { k: "Mode de paiement", v: form.payment_method?.replace(/_/g, " ") || "—" },
                  ].map(({ k, v }) => (
                    <div
                      key={k}
                      style={{ background: "#FFFFFF", padding: "12px 16px", borderRadius: 10, border: "1px solid #E2E8F0" }}
                    >
                      <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 5px" }}>{k}</p>
                      <p style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, margin: 0, wordBreak: "break-word" }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature card */}
              <div style={cardCls}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "6px 8px" }}>
                    <PenTool size={14} color="#1D4ED8" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                      Votre signature <span style={{ color: "#EF4444" }}>*</span>
                    </h2>
                    <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
                      En signant, vous certifiez l'exactitude des informations et autorisez le traitement.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: "#F8FAFC",
                    border: `2px dashed ${signature ? "#10B981" : "#CBD5E1"}`,
                    borderRadius: 14,
                    padding: 16,
                    marginTop: 18,
                    marginBottom: 14,
                    transition: "border-color 0.2s",
                  }}
                >
                  <SignatureCanvas onSave={setSignature} initialSignature={signature} />
                </div>

                {!signature ? (
                  <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={14} color="#D97706" />
                    <span style={{ color: "#92400E", fontSize: 13, fontWeight: 500 }}>
                      La signature est obligatoire pour soumettre la fiche
                    </span>
                  </div>
                ) : (
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={14} color="#059669" />
                    <span style={{ color: "#065F46", fontSize: 13, fontWeight: 600 }}>
                      Signature apposée avec succès ✓
                    </span>
                  </div>
                )}
              </div>

              {/* Workflow info */}
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 14, marginBottom: 20 }}>
                <Info size={17} color="#1D4ED8" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", margin: "0 0 8px" }}>
                    Workflow d'approbation après soumission
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ background: "#DBEAFE", color: "#1D4ED8", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                      Vous (Demandeur)
                    </span>
                    {WORKFLOW_STEPS.map((s, i) => (
                      <React.Fragment key={s}>
                        <ChevronRight size={12} color="#93C5FD" />
                        <span style={{ background: "#DBEAFE", color: "#1D4ED8", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                          {s}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <AlertCircle size={16} color="#DC2626" />
                  <span style={{ color: "#991B1B", fontSize: 13 }}>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              NAVIGATION BUTTONS
          ════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "18px 24px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.06)",
              border: "1px solid rgba(226,232,240,0.7)",
            }}
          >
            {/* Left: Cancel + Back */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="fdp-btn-secondary"
                style={{
                  padding: "10px 18px", border: "1.5px solid #E2E8F0",
                  background: "#FFFFFF", color: "#64748B", borderRadius: 10,
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                }}
              >
                Annuler
              </button>

              {step > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="fdp-btn-secondary"
                  style={{
                    padding: "10px 18px", border: "1.5px solid #E2E8F0",
                    background: "#FFFFFF", color: "#374151", borderRadius: 10,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                  }}
                >
                  <ChevronLeft size={15} /> Précédent
                </button>
              )}
            </div>

            {/* Step indicator */}
            <div style={{ display: "flex", gap: 6 }}>
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  style={{
                    width: s.id === step ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: s.id < step ? "#10B981" : s.id === step ? "#1D4ED8" : "#E2E8F0",
                    transition: "all 0.3s",
                  }}
                />
              ))}
            </div>

            {/* Right: Print + Next/Submit */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: "10px 16px", border: "1.5px solid #E2E8F0",
                  background: "#FFFFFF", color: "#64748B", borderRadius: 10,
                  fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Eye size={14} /> Aperçu
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="fdp-btn-primary"
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg,#1D4ED8,#2563EB)",
                    color: "#FFFFFF", border: "none", borderRadius: 10,
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 4px 14px rgba(29,78,216,0.3)",
                    transition: "all 0.2s",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Suivant <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !signature}
                  className={loading || !signature ? "" : "fdp-btn-primary"}
                  style={{
                    padding: "10px 28px",
                    background: loading || !signature
                      ? "#E2E8F0"
                      : "linear-gradient(135deg,#059669,#10B981)",
                    color: loading || !signature ? "#9CA3AF" : "#FFFFFF",
                    border: "none", borderRadius: 10,
                    fontSize: 14, fontWeight: 700,
                    cursor: loading || !signature ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    boxShadow: loading || !signature ? "none" : "0 4px 14px rgba(5,150,105,0.3)",
                    transition: "all 0.2s",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Traitement…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      {isEditing ? "Mettre à jour" : "Soumettre la fiche"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Hidden print view */}
      <div className="hidden">
        <div ref={printRef}>
          <PrintableFDP
            data={{
              ...(form as FDP),
              requester_signature: signature,
              requester_name:      user?.fullName || "",
              requester_position:  user?.position || "",
              reference:           form.reference || `TEMP-${format(creationDate, "ddMMyyyy")}-F`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FDPForm;