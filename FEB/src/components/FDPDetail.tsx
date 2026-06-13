import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { Fiche, Signature } from "../types";
import SignatureCanvas from "./SignatureCanvas";
import {
  Edit,
  Trash2,
  Printer,
  PenTool,
  Check,
  Clock,
  AlertCircle,
  Users,
  CheckCircle,
  Building2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";

const FDPDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [currentSignatureRole, setCurrentSignatureRole] = useState<string>("");

  useEffect(() => {
    if (id) {
      fetchFiche();
    }
  }, [id]);

  const fetchFiche = async () => {
    try {
      const response = await api.get(`/api/fiches/${id}`);
      setFiche(response.data.data);
    } catch (error) {
      console.error("Error fetching fiche:", error);
      toast.error("Erreur lors du chargement de la fiche");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Fiche-${fiche?.id}-${format(new Date(), "yyyyMMdd")}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body { 
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.3;
        }
        .print-break { page-break-before: always; }
        .no-print { display: none !important; }
      }
    `,
  });

  const handleDelete = async () => {
    if (!fiche || !user) return;

    // Autoriser admin à supprimer n'importe quelle fiche
    if (user.role !== "admin" && fiche.demandeurId !== user.id) {
      toast.error("Seul le demandeur ou admin peut supprimer cette fiche");
      return;
    }

    if (user.role !== "admin" && fiche.status !== "Brouillon") {
      toast.error("Impossible de supprimer une fiche signée");
      return;
    }

    /*if (fiche.demandeurId !== user.id) {
      toast.error("Seul le demandeur peut supprimer cette fiche");
      return;
    }*/

    if (user.role !== "admin" && fiche.status !== "Brouillon") {
      toast.error("Impossible de supprimer une fiche signée");
      return;
    }

    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette fiche ?")) {
      try {
        await api.delete(`/api/fiches/${id}`);
        toast.success("Fiche supprimée avec succès");
        navigate("/");
      } catch (error) {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const handleSign = (role: string) => {
    setCurrentSignatureRole(role);
    setShowSignatureCanvas(true);
  };

  const handleSaveSignature = async (signatureData: string) => {
    try {
      await api.post(`/api/fiches/${id}/sign`, {
        role: currentSignatureRole,
        signatureData,
      });

      toast.success("Signature enregistrée avec succès");
      setShowSignatureCanvas(false);
      setCurrentSignatureRole("");
      fetchFiche(); // Refresh data
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Erreur lors de la signature";
      toast.error(message);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Brouillon: { color: "bg-gray-100 text-gray-800", icon: Clock },
      En_Attente: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      Signe: { color: "bg-blue-100 text-blue-800", icon: Users },
      Valide: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config?.color}`}
      >
        <Icon className="w-4 h-4 mr-1" />
        {status.replace("_", " ")}
      </span>
    );
  };

  const canUserSign = (role: string) => {
    if (!user || !fiche) return false;

    // Check if user has the required role
    if (user.role !== role) return false;

    // Check if already signed
    const existingSignature = fiche.signatures.find(
      (sig) => sig.role === role && sig.signedAt
    );
    if (existingSignature) return false;

    // For directeur_general, check if demandeur has signed
    if (role === "directeur_general") {
      const demandeurSigned = fiche.signatures.find(
        (sig) => sig.role === "demandeur" && sig.signedAt
      );
      return !!demandeurSigned;
    }

    return true;
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      demandeur: "Demandeur",
      directeur_general: "Directeur Général",
      superieur_hierarchique: "Supérieur Hiérarch",
      Controle_Qualite: "Gestion qualité",
      Controle_Gestion: "Contrôle gestion",
      Magasinier: "Magasinier",
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const parseMateriels = (description: string) => {
    if (!description) return [];

    return description
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        // Parse format: "Nom (État: état, N° série: numéro)" ou "Nom (État: état)"
        const match = line.match(
          /^(.+?)\s*\(État:\s*(.+?)(?:,\s*N°\s*série:\s*(.+?))?\)$/
        );
        if (match) {
          return {
            id: index.toString(),
            nom: match[1].trim(),
            etat: match[2].trim(),
            numeroSerie: match[3]?.trim() || "-",
          };
        }
        // Fallback pour format simple
        return {
          id: index.toString(),
          nom: line.trim(),
          etat: "bon",
          numeroSerie: "-",
        };
      });
  };

  const getSignatureDisplay = (
    role: string,
    position:
      | "demandeur"
      | "superieur"
      | "qualite"
      | "gestion"
      | "directeur"
      | "magasinier"
      | "dg"
  ) => {
    const signature = fiche?.signatures.find((sig) => sig.role === role);
    const isObligatory = ["demandeur", "directeur_general"].includes(role);

    if (signature?.signedAt) {
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {getRoleDisplayName(role)} :
            {isObligatory && <span className="text-red-500 ml-1">*</span>}
          </div>
          <div className="flex-1 flex items-center justify-center">
            {signature.signatureData && (
              <img
                src={signature.signatureData}
                alt="Signature"
                className="max-h-12 max-w-full object-contain"
              />
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {format(new Date(signature.signedAt), "dd/MM/yyyy", { locale: fr })}
          </div>
          <div className="text-xs text-gray-600">{signature.user.fullName}</div>
        </div>
      );
    }

    if (canUserSign(role)) {
      return (
        <div className="h-full flex flex-col justify-between">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {getRoleDisplayName(role)} :
            {isObligatory && <span className="text-red-500 ml-1">*</span>}
          </div>
          <button
            onClick={() => handleSign(role)}
            className="flex-1 border-2 border-dashed border-indigo-300 rounded flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-colors text-xs"
          >
            <PenTool className="w-3 h-3 mr-1" />
            Signer
          </button>
          <div className="text-xs text-gray-500 mt-1">Date</div>
          <div className="text-xs text-gray-600">Nom</div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col justify-between">
        <div className="text-sm font-medium text-gray-700 mb-2">
          {getRoleDisplayName(role)} :
          {isObligatory && <span className="text-red-500 ml-1">*</span>}
        </div>
        <div className="flex-1 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
          <span className="text-xs text-gray-400">En attente</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">Date</div>
        <div className="text-xs text-gray-600">Nom</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Fiche non trouvée
        </h3>
      </div>
    );
  }

  const canEdit =
    user?.id === fiche.demandeurId && fiche.status === "Brouillon";
  const canDelete =
    user?.role === "admin" ||
    (user?.id === fiche.demandeurId && fiche.status === "Brouillon");
  const materiels = parseMateriels(fiche.description);

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Fiche #{fiche.id}
              </h1>
              {getStatusBadge(fiche.status)}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </button>

              {canEdit && (
                <button
                  onClick={() => navigate(`/fiche/${id}/edit`)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </button>
              )}

              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Printable Content */}
        <div
          ref={printRef}
          className="bg-white shadow-lg rounded-lg border border-gray-200 print:shadow-none print:border-none"
        >
          {/* Header - Modèle VIPNET */}
          <div className="border-b-2 border-gray-800 px-6 py-4 bg-gray-50 print:bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-black text-white px-3 py-2 font-bold text-lg print:text-base">
                  VIPNET
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 uppercase print:text-lg">
                    Fiche de matériels
                  </h1>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 print:text-xs">
                  Ouagadougou le{" "}
                  {format(new Date(fiche.dateCreation), "dd MMMM yyyy", {
                    locale: fr,
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 print:p-4">
            {/* Première ligne - N°, Raisons, Destinat/prov */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-gray-300 pb-4 mb-4 print:gap-4 print:mb-3">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 min-w-0 print:text-xs">
                  N°
                </span>
                <div className="flex-1 border-b border-gray-400 pb-1">
                  <span className="text-sm text-gray-900 print:text-xs">
                    {fiche.id}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 min-w-0 print:text-xs">
                  Raisons :
                </span>
                <div className="flex-1 border-b border-gray-400 pb-1">
                  <span className="text-sm text-red-600 print:text-xs">
                    {fiche.raisons || "Entrée de matériels"}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 min-w-0 print:text-xs">
                  Destinat/prov
                </span>
                <div className="flex-1 border-b border-gray-400 pb-1">
                  <span className="text-sm text-gray-900 print:text-xs">
                    {fiche.destinataire || fiche.client}
                  </span>
                </div>
              </div>
            </div>

            {/* Deuxième ligne - Demandeur */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-gray-300 pb-4 mb-4 print:gap-4 print:mb-3">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 min-w-0 print:text-xs">
                  Demandeur
                </span>
                <div className="flex-1 border-b border-gray-400 pb-1">
                  <div className="text-sm text-gray-900 print:text-xs">
                    {fiche.demandeur.fullName}
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau principal */}
            <div className="border border-gray-400 mb-6 print:mb-4">
              {/* En-tête du tableau */}
              <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-400 print:bg-gray-50">
                <div className="col-span-3 p-3 border-r border-gray-400 print:p-2">
                  <span className="text-sm font-medium text-gray-700 print:text-xs">
                    Nom du client / du département VIPNET-BF
                  </span>
                </div>
                <div className="col-span-4 p-3 border-r border-gray-400 print:p-2">
                  <span className="text-sm font-medium text-gray-700 print:text-xs">
                    Matériels
                  </span>
                </div>
                <div className="col-span-2 p-3 border-r border-gray-400 print:p-2">
                  <span className="text-sm font-medium text-gray-700 print:text-xs">
                    État
                  </span>
                </div>
                <div className="col-span-3 p-3 print:p-2">
                  <span className="text-sm font-medium text-gray-700 print:text-xs">
                    N° Séries
                  </span>
                </div>
              </div>

              {/* Contenu du tableau */}
              <div className="min-h-32 print:min-h-24">
                {materiels.length > 0 ? (
                  materiels.map((materiel, index) => (
                    <div
                      key={materiel.id}
                      className="grid grid-cols-12 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="col-span-3 p-3 border-r border-gray-400 print:p-2">
                        {index === 0 && (
                          <div className="text-sm text-gray-900 print:text-xs">
                            {fiche.client}
                          </div>
                        )}
                      </div>
                      <div className="col-span-4 p-3 border-r border-gray-400 print:p-2">
                        <div className="text-sm text-gray-900 print:text-xs">
                          {materiel.nom}
                        </div>
                      </div>
                      <div className="col-span-2 p-3 border-r border-gray-400 print:p-2">
                        <div className="text-sm text-gray-900 print:text-xs">
                          {materiel.etat}
                        </div>
                      </div>
                      <div className="col-span-3 p-3 print:p-2">
                        <div className="text-sm text-gray-900 print:text-xs">
                          {materiel.numeroSerie}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-12 min-h-32 print:min-h-24">
                    <div className="col-span-3 p-3 border-r border-gray-400 print:p-2">
                      <div className="text-sm text-gray-900 print:text-xs">
                        {fiche.departement}
                      </div>
                    </div>
                    <div className="col-span-4 p-3 border-r border-gray-400 print:p-2">
                      <div className="text-sm text-gray-900 whitespace-pre-line print:text-xs">
                        {fiche.description}
                      </div>
                    </div>
                    <div className="col-span-2 p-3 border-r border-gray-400 print:p-2">
                      <div className="text-sm text-gray-900 print:text-xs">
                        bon
                      </div>
                    </div>
                    <div className="col-span-3 p-3 print:p-2">
                      <div className="text-sm text-gray-900 print:text-xs">
                        -
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section Signatures */}
            <div className="border-t-2 border-gray-800 pt-6 print:pt-4">
              <div className="text-center mb-4 print:mb-3">
                <h3 className="text-lg font-bold text-orange-600 uppercase print:text-base">
                  Signatures
                </h3>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 border border-gray-400 print:gap-2">
                {/* Première ligne de signatures */}
                <div className="border-r border-gray-400 p-4 text-center print:p-2">
                  {getSignatureDisplay("demandeur", "demandeur")}
                </div>

                <div className="border-r border-gray-400 p-4 text-center lg:border-r-0 print:p-2">
                  {getSignatureDisplay("superieur_hierarchique", "superieur")}
                </div>

                <div className="col-span-2 lg:col-span-1 border-r border-gray-400 lg:border-r-0 p-4 print:p-2">
                  <div className="grid grid-cols-2 h-full gap-2">
                    <div className="text-center border-r border-gray-300 pr-2">
                      {getSignatureDisplay("Controle_Qualite", "qualite")}
                    </div>
                    <div className="text-center pl-2">
                      {getSignatureDisplay("Controle_Gestion", "gestion")}
                    </div>
                  </div>
                  <div className="text-center mt-4 pt-4 border-t border-gray-300 print:mt-2 print:pt-2">
                    <div className="text-sm font-medium text-gray-700 mb-2 print:text-xs">
                      Directeur Filiale :
                    </div>
                    <div className="h-12 border-b border-gray-300 print:h-8"></div>
                  </div>
                </div>

                {/* Deuxième ligne */}
                <div className="col-span-2 lg:col-span-3 border-t border-gray-400 p-4 print:p-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:gap-2">
                    <div className="text-center">
                      {getSignatureDisplay("Magasinier", "magasinier")}
                    </div>
                    <div className="text-center">
                      {getSignatureDisplay("directeur_general", "dg")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:block mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex justify-between">
                <div>
                  Imprimé le{" "}
                  {format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}
                </div>
                <div>VIPNET - Système de Gestion des Fiches Matériel</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Canvas Modal */}
      {showSignatureCanvas && (
        <SignatureCanvas
          onSave={handleSaveSignature}
          onCancel={() => {
            setShowSignatureCanvas(false);
            setCurrentSignatureRole("");
          }}
        />
      )}
    </>
  );
};

export default FDPDetail;
