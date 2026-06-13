import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { getFDP, signFDP, deleteFDP } from "../api";
import { FDP, UserRole, FDPStatus, SignatureAction } from "../types";
import { useAuth } from "../context/AuthContext";
import SignatureCanvas from "./SignatureCanvas";

const FDPDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fdp, setFdp] = useState<FDP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [validatedAmount, setValidatedAmount] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Rôle sélectionné (peut différer du rôle réel pour DG et Caisse)
  const selectedRole: UserRole =
    (location.state?.selectedRole as UserRole) || (user?.role as UserRole);

  // ── Rôles disponibles selon le rôle réel ──────────────────────────────────
  const getAvailableRoles = (): UserRole[] => {
    if (!user) return [];
    switch (user.role) {
      case UserRole.DIRECTEUR_GENERAL:
        return [UserRole.DIRECTEUR_GENERAL, UserRole.CHEF_SERVICE];
      case UserRole.CAISSE:
        return [UserRole.CAISSE, UserRole.DEMANDEUR, UserRole.CHEF_SERVICE];
      default:
        return [user.role as UserRole];
    }
  };

  const [activeRole, setActiveRole] = useState<UserRole>(selectedRole);
  const availableRoles = getAvailableRoles();

  const fetchFDP = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getFDP(parseInt(id));
      setFdp(data);
      if (data.validated_amount) {
        setValidatedAmount(data.validated_amount.toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch FDP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDP();
  }, [id]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  // ── Peut-on signer avec le rôle actif ? ───────────────────────────────────
  // Règle : pas de blocage par statut ; on vérifie uniquement si le champ est vide
  //         et que la fiche n'est pas rejetée.
  const canSign = (): boolean => {
    if (!user || !fdp) return false;
    if (fdp.status === FDPStatus.REJECTED) return false;

    switch (activeRole) {
      case UserRole.DEMANDEUR:
        return !fdp.requester_signature;

      case UserRole.CHEF_SERVICE: // superieur_hierarchique
        return !fdp.superieur_hierarchique_signature;

      case UserRole.RESPONSABLE_COMPTABLE: // comptabilite
        return !fdp.comptabilite_signature;

      case UserRole.DIRECTEUR_GENERAL:
        return !fdp.directeur_general_signature;

      case UserRole.CAISSE:
        return !fdp.caisse_signature;

      default:
        return false;
    }
  };

  // ── Peut-on modifier la fiche ? ───────────────────────────────────────────
  // Modification impossible si le DG a signé (sauf admin)
  const canEdit = (): boolean => {
    if (!user || !fdp) return false;
    if (fdp.status === FDPStatus.REJECTED) return false;
    if (fdp.directeur_general_signature) return false;

    // Seul le demandeur (ou quelqu'un agissant en tant que demandeur) peut modifier
    return (
      (activeRole === UserRole.DEMANDEUR || user.role === UserRole.ADMIN) &&
      fdp.requester_id?.toString() === user.id?.toString()
    );
  };

  // ── Peut-on supprimer la fiche ? ──────────────────────────────────────────
  const canDelete = (): boolean => {
    if (!user || !fdp) return false;
    if (user.role === UserRole.ADMIN) return true;

    return (
      activeRole === UserRole.DEMANDEUR &&
      fdp.requester_id?.toString() === user.id?.toString() &&
      !fdp.directeur_general_signature &&
      ![FDPStatus.COMPLETED, FDPStatus.REJECTED].includes(fdp.status)
    );
  };

  // ── Libellé du rôle ───────────────────────────────────────────────────────
  const formatRoleName = (role: UserRole): string => {
    const labels: Partial<Record<UserRole, string>> = {
      [UserRole.DEMANDEUR]: "Demandeur",
      [UserRole.CHEF_SERVICE]: "Supérieur hiérarchique",
      [UserRole.RESPONSABLE_COMPTABLE]: "Comptabilité",
      [UserRole.DIRECTEUR_GENERAL]: "Directeur Général",
      [UserRole.CAISSE]: "Caisse",
    };
    return (
      labels[role] ??
      role
        .split("_")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ")
    );
  };

  // ── Signature ─────────────────────────────────────────────────────────────
  const handleSign = async (approved: boolean) => {
    if (!user || !fdp || !id) return;

    // Validation montant pour le DG
    if (activeRole === UserRole.DIRECTEUR_GENERAL && approved) {
      if (fdp.type_description !== "Expression de besoin") {
        if (!validatedAmount) {
          setError("Le montant validé est requis pour le Directeur Général.");
          return;
        }
        const cleaned = validatedAmount.replace(/\s/g, "").replace(/,/g, ".");
        if (isNaN(parseFloat(cleaned))) {
          setError("Le montant validé doit être un nombre valide.");
          return;
        }
      }
    }

    try {
      setSigningInProgress(true);
      setError(null);

      const signatureData: SignatureAction = {
        fdpId: parseInt(id),
        signature: signature || "",
        role: activeRole,
        approved,
        rejectionReason: approved ? undefined : rejectionReason,
        selectedRole: activeRole,
      };

      if (
        activeRole === UserRole.DIRECTEUR_GENERAL &&
        approved &&
        fdp.type_description !== "Expression de besoin" &&
        validatedAmount
      ) {
        const cleaned = validatedAmount.replace(/[^0-9]/g, "");
        signatureData.validatedAmount = parseInt(cleaned, 10);
      }

      const updatedFdp = await signFDP(signatureData);

      setFdp((prev) => {
        if (!prev) return updatedFdp;
        return {
          ...prev,
          ...updatedFdp,
          requester_name: updatedFdp.requester_name || prev.requester_name,
          requester_position: updatedFdp.requester_position || prev.requester_position,
          requester_department: updatedFdp.requester_department || prev.requester_department,
          requester_phone: updatedFdp.requester_phone || prev.requester_phone,
          requester_email: updatedFdp.requester_email || prev.requester_email,
        };
      });

      setShowRejectionForm(false);
      setSignature(null);
      setRejectionReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la signature");
    } finally {
      setSigningInProgress(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Êtes-vous sûr de vouloir supprimer cette fiche ?")) return;
    try {
      await deleteFDP(parseInt(id));
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete FDP");
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!fdp) {
    return (
      <div className="text-center py-8">
        <p className="text-xl text-gray-600">
          {error || "Fiche non trouvée"}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">

        {/* ── Barre d'actions ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">
            Fiche — {fdp.reference?.replace("TEMP-", "")}
          </h1>

          <div className="flex flex-wrap gap-2">
            {/* Sélecteur de rôle (DG et Caisse uniquement) */}
            {availableRoles.length > 1 && (
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as UserRole)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {formatRoleName(r)}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Imprimer
            </button>

            {canDelete() && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Supprimer
              </button>
            )}

            {canEdit() && (
              <button
                onClick={() => navigate(`/fdp/edit/${id}`)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Modifier
              </button>
            )}
          </div>
        </div>

        {/* ── Message erreur global ── */}
        {error && !showRejectionForm && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* ── Rejet ── */}
        {fdp.status === FDPStatus.REJECTED && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Demande rejetée</p>
            <p>Raison : {fdp.rejection_reason}</p>
            <p>Rejetée par : {fdp.rejected_by}</p>
            {fdp.rejection_date && (
              <p>
                Date :{" "}
                {format(new Date(fdp.rejection_date), "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </div>
        )}

        {/* ── Informations générales ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Informations générales</h2>
            <div className="bg-gray-50 p-4 rounded-md space-y-1">
              <p><strong>FICHE D':</strong> {fdp.type_description}</p>
              <p>
                <strong>Date de création :</strong>{" "}
                {format(new Date(fdp.creation_date), "dd/MM/yyyy")}
              </p>
              <p><strong>Statut :</strong> {getStatusLabel(fdp.status)}</p>
              <p><strong>Référence :</strong> {fdp.reference}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Demandeur</h2>
            <div className="bg-gray-50 p-4 rounded-md space-y-1">
              <p><strong>Nom :</strong> {fdp.requester_name}</p>
              <p><strong>Poste :</strong> {fdp.requester_position}</p>
              <p><strong>Département :</strong> {fdp.requester_department}</p>
              <p><strong>Email :</strong> {fdp.requester_email}</p>
              <p><strong>Téléphone :</strong> {fdp.requester_phone}</p>
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Description de la demande</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <p>{fdp.description}</p>
          </div>
        </div>

        {/* ── Montants & Paiement ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Montant</h2>
            <div className="bg-gray-50 p-4 rounded-md space-y-1">
              <p><strong>Montant demandé :</strong> {fdp.amount ?? "Non spécifié"}</p>
              <p><strong>Montant validé :</strong> {fdp.validated_amount ?? "Non spécifié"}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Mode de paiement</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p>{fdp.payment_method ? fdp.payment_method.replace(/_/g, " ") : "Non spécifié"}</p>
              {fdp.payment_reference && (
                <p><strong>Référence :</strong> {fdp.payment_reference}</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Départements</h2>
            <div className="bg-gray-50 p-4 rounded-md space-y-1">
              <p><strong>Source :</strong> {fdp.department_source}</p>
              <p>
                <strong>Destination :</strong>{" "}
                {fdp.department_destination?.join(", ") || "Non spécifié"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Signatures (5 champs actifs — Opérations et Trésorerie masqués) ── */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Signatures</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <SignatureBox
              title="Demandeur"
              signature={fdp.requester_signature}
              date={fdp.requester_signature_date}
            />
            <SignatureBox
              title="Supérieur hiérarchique"
              signature={fdp.superieur_hierarchique_signature}
              date={fdp.superieur_hierarchique_signature_date}
            />
            <SignatureBox
              title="Comptabilité"
              signature={fdp.comptabilite_signature}
              date={fdp.comptabilite_signature_date}
            />
            <SignatureBox
              title="Directeur Général"
              signature={fdp.directeur_general_signature}
              date={fdp.directeur_general_signature_date}
            />
            <SignatureBox
              title="Caisse"
              signature={fdp.caisse_signature}
              date={fdp.caisse_signature_date}
            />
          </div>
        </div>

        {/* ── Zone de signature ── */}
        {canSign() && (
          <div className="border border-blue-200 bg-blue-50 rounded-md p-4 mb-6">
            <h2 className="text-lg font-semibold mb-1">
              Signature — {formatRoleName(activeRole)}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Vous signez en tant que <strong>{formatRoleName(activeRole)}</strong>.
              Cette action est définitive et ne peut pas être annulée.
            </p>

            {/* Champ montant pour le DG */}
            {activeRole === UserRole.DIRECTEUR_GENERAL && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-1 font-medium">
                  Montant validé{" "}
                  {fdp.type_description !== "Expression de besoin" ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-sm text-gray-400">(optionnel)</span>
                  )}
                  <span className="text-xs text-gray-400 ml-1">(entier, ex : 250000)</span>
                </label>
                <input
                  type="text"
                  value={validatedAmount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, "");
                    setValidatedAmount(clean);
                    if (clean === "" && fdp.type_description !== "Expression de besoin") {
                      setError("Le montant validé est requis");
                    } else {
                      setError(null);
                    }
                  }}
                  className={`w-full p-2 border rounded-md ${
                    error ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Ex : 150000"
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>
            )}

            {!showRejectionForm ? (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium">
                    Votre signature
                  </label>
                  <SignatureCanvas onSave={setSignature} />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectionForm(true)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Rejeter
                  </button>
                  <button
                    onClick={() => handleSign(true)}
                    disabled={!signature || signingInProgress}
                    className={`px-4 py-2 rounded-md ${
                      !signature || signingInProgress
                        ? "bg-gray-300 cursor-not-allowed text-gray-500"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {signingInProgress ? "Traitement..." : "Approuver et signer"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium">
                    Raison du rejet
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Expliquez pourquoi vous rejetez cette demande"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectionForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleSign(false)}
                    disabled={!rejectionReason || signingInProgress}
                    className={`px-4 py-2 rounded-md ${
                      !rejectionReason || signingInProgress
                        ? "bg-gray-300 cursor-not-allowed text-gray-500"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    {signingInProgress ? "Traitement..." : "Confirmer le rejet"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Message si signature déjà apposée */}
        {!canSign() &&
          fdp.status !== FDPStatus.REJECTED &&
          availableRoles.includes(activeRole) && (
            <div className="border border-green-200 bg-green-50 rounded-md p-4 mb-6 text-green-700 text-sm">
              ✅ Votre signature ({formatRoleName(activeRole)}) a déjà été apposée sur cette fiche.
            </div>
          )}

        {/* Version imprimable masquée */}
        <div className="hidden">
          <div ref={printRef} className="p-8 bg-white">
            <FDPPrintView data={fdp} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Composant boîte de signature ─────────────────────────────────────────────

const SignatureBox: React.FC<{
  title: string;
  signature: string | null | undefined;
  date: string | null | undefined;
  optional?: boolean;
}> = ({ title, signature, date, optional = false }) => (
  <div className="border border-gray-300 rounded-md p-3">
    <h3 className="font-medium text-sm mb-2">
      {title}{" "}
      {optional && <span className="text-xs text-gray-400">(optionnel)</span>}
    </h3>
    {signature ? (
      <>
        <div className="h-20 flex items-center justify-center bg-gray-50 mb-1 rounded">
          <img
            src={signature}
            alt={`Signature ${title}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        {date && (
          <p className="text-xs text-gray-500 text-center">
            {format(new Date(date), "dd/MM/yyyy")}
          </p>
        )}
      </>
    ) : (
      <div className="h-20 flex items-center justify-center bg-gray-50 text-gray-400 text-xs rounded">
        En attente
      </div>
    )}
  </div>
);

// ─── Vue imprimable ───────────────────────────────────────────────────────────

const FDPPrintView: React.FC<{ data: FDP }> = ({ data }) => (
  <div className="max-w-4xl mx-auto border border-gray-300 p-6">
    <h1 className="text-xl font-bold text-center mb-2">{data.type_description}</h1>
    <p className="text-center mb-6">Référence : {data.reference}</p>

    <div className="grid grid-cols-2 gap-6 mb-6">
      <div className="border border-gray-300 p-4 space-y-2">
        <p><strong>Date :</strong> {format(new Date(data.creation_date), "dd/MM/yyyy")}</p>
        <p><strong>Poste :</strong> {data.requester_position}</p>
        <p><strong>Nom et prénoms :</strong> {data.requester_name}</p>
      </div>

      <div className="border border-gray-300 p-4">
        <p className="text-center mb-2 text-sm italic">(cocher la case correspondante)</p>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Direction / Service</th>
              <th className="text-center">demandeur</th>
              <th className="text-center">destinataire</th>
            </tr>
          </thead>
          <tbody>
            {["Direction Générale", "Technique", "Commercial", "Opérations", "Comptabilité"].map((dept) => (
              <tr key={dept}>
                <td>{dept}</td>
                <td className="text-center">{data.department_source === dept ? "✓" : "□"}</td>
                <td className="text-center">
                  {(data.department_destination || []).includes(dept) ? "✓" : "□"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="border border-gray-300 p-4 mb-6">
      <div className="flex justify-between mb-2">
        <p><strong>Montant :</strong> {data.amount ?? ""}</p>
        <p>{data.payment_reference ?? ""}</p>
      </div>
      <p className="font-bold mb-2">DESCRIPTION</p>
      <p>{data.description}</p>
    </div>

    {/* Signatures — 5 champs actifs */}
    <div className="mb-6">
      <p className="text-center font-bold mb-2">VALIDATION (Date et Signature)</p>
      <div className="grid grid-cols-5 gap-2">
        {[
          { title: "Demandeur",              sig: data.requester_signature,              date: data.requester_signature_date },
          { title: "Supérieur hiérarchique", sig: data.superieur_hierarchique_signature, date: data.superieur_hierarchique_signature_date },
          { title: "Comptabilité",           sig: data.comptabilite_signature,           date: data.comptabilite_signature_date },
          { title: "Directeur Général",      sig: data.directeur_general_signature,      date: data.directeur_general_signature_date },
          { title: "Caisse",                 sig: data.caisse_signature,                 date: data.caisse_signature_date },
        ].map(({ title, sig, date }) => (
          <div key={title} className="border border-gray-300 p-2 text-center">
            <p className="font-bold text-xs mb-2">{title}</p>
            {sig ? (
              <img src={sig} alt="Signature" className="h-16 mx-auto object-contain" />
            ) : (
              <p className="text-xs italic text-gray-400 h-16 flex items-center justify-center">En attente</p>
            )}
            <p className="text-xs mt-1">
              {date ? format(new Date(date), "dd/MM/yyyy") : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Montant validé */}
      <div className="mt-2 border border-gray-300 p-2 text-center">
        <p className="font-bold mb-1">Montant validé</p>
        <p className="text-xl font-bold">{data.validated_amount ?? "—"} FCFA</p>
      </div>
    </div>

    <div className="mb-2 text-right text-xs italic">(réservé à la comptabilité)</div>

    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border border-gray-300 p-2 text-left">Mode de paiement</th>
          <th className="border border-gray-300 p-2 text-center">✓</th>
          <th className="border border-gray-300 p-2 text-left">Référence</th>
        </tr>
      </thead>
      <tbody>
        {[
          "virement_bancaire", "chèque_barré", "chèque_non_barré",
          "espèces", "monnaie_électronique", "autre",
        ].map((method) => (
          <tr key={method}>
            <td className="border border-gray-300 p-2">{method.replace(/_/g, " ")}</td>
            <td className="border border-gray-300 p-2 text-center">
              {data.payment_method === method ? "●" : "○"}
            </td>
            <td className="border border-gray-300 p-2">
              {data.payment_method === method ? data.payment_reference : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Libellé de statut ────────────────────────────────────────────────────────

const getStatusLabel = (status: FDPStatus): string => {
  const labels: Partial<Record<FDPStatus, string>> = {
    [FDPStatus.DRAFT]: "Brouillon",
    [FDPStatus.PENDING_CHEF_SERVICE]: "En attente — Supérieur hiérarchique",
    [FDPStatus.PENDING_RESPONSABLE_COMPTABLE]: "En attente — Comptabilité",
    [FDPStatus.PENDING_DIRECTEUR_GENERAL]: "En attente — Directeur Général",
    [FDPStatus.PENDING_CAISSE]: "En attente — Caisse",
    [FDPStatus.COMPLETED]: "Complétée ✅",
    [FDPStatus.REJECTED]: "Rejetée ❌",
  };
  return labels[status] ?? status;
};

export default FDPDetail;