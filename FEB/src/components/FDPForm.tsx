import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { FicheFormData } from "../types";
import { Save, FileText, Building2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface MaterialItem {
  id: string;
  nom: string;
  etat: string;
  numeroSerie: string;
}

const FDPForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FicheFormData>({
    client: "",
    departement: "",
    description: "",
    isInternal: false,
  });

  const [raisons, setRaisons] = useState("Entrée de matériels");
  const [destinataire, setDestinataire] = useState("");
  const [materiels, setMateriels] = useState<MaterialItem[]>([
    { id: "1", nom: "", etat: "bon", numeroSerie: "" },
  ]);

  // Options prédéfinies pour les listes déroulantes
  const raisonsOptions = [
    {
      value: "Entrée de matériels",
      label: "Entrée de matériels",
      color: "text-green-600",
    },
    {
      value: "Sortie de matériels",
      label: "Sortie de matériels",
      color: "text-red-600",
    },
    {
      value: "Transfert de matériels",
      label: "Transfert de matériels",
      color: "text-blue-600",
    },
    {
      value: "Maintenance de matériels",
      label: "Maintenance de matériels",
      color: "text-orange-600",
    },
    {
      value: "Retour de matériels",
      label: "Retour de matériels",
      color: "text-purple-600",
    },
    {
      value: "Réparation de matériels",
      label: "Réparation de matériels",
      color: "text-yellow-600",
    },
    {
      value: "Inventaire de matériels",
      label: "Inventaire de matériels",
      color: "text-gray-600",
    },
  ];

  const etatOptions = [
    { value: "neuf", label: "Neuf", color: "text-green-600", icon: "✨" },
    { value: "bon", label: "Bon", color: "text-green-500", icon: "✅" },
    { value: "moyen", label: "Moyen", color: "text-yellow-600", icon: "⚠️" },
    { value: "usagé", label: "Usagé", color: "text-orange-500", icon: "🔄" },
    {
      value: "défaillant",
      label: "Défaillant",
      color: "text-red-600",
      icon: "❌",
    },
    {
      value: "à réparer",
      label: "À réparer",
      color: "text-red-500",
      icon: "🔧",
    },
    {
      value: "hors service",
      label: "Hors service",
      color: "text-gray-600",
      icon: "🚫",
    },
    {
      value: "en maintenance",
      label: "En maintenance",
      color: "text-blue-600",
      icon: "🛠️",
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addMaterielRow = () => {
    const newId = (materiels.length + 1).toString();
    setMateriels([
      ...materiels,
      { id: newId, nom: "", etat: "bon", numeroSerie: "" },
    ]);
  };

  const removeMaterielRow = (id: string) => {
    if (materiels.length > 1) {
      setMateriels(materiels.filter((item) => item.id !== id));
    }
  };

  const updateMateriel = (
    id: string,
    field: keyof MaterialItem,
    value: string
  ) => {
    setMateriels(
      materiels.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construire la description complète avec tous les matériels
      const descriptionComplete = materiels
        .filter((item) => item.nom.trim())
        .map(
          (item) =>
            `${item.nom} (État: ${item.etat}${
              item.numeroSerie ? `, N° série: ${item.numeroSerie}` : ""
            })`
        )
        .join("\n");

      const ficheData = {
        ...formData,
        description: descriptionComplete,
        raisons,
        destinataire: destinataire || formData.client,
      };

      const response = await api.post("/api/fiches", ficheData);
      const fiche = response.data.data;

      toast.success("Fiche créée avec succès");
      navigate(`/fiche/${fiche.id}`);
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Erreur lors de la création";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    formData.client.trim() &&
    //formData.departement.trim() &&
    materiels.some((item) => item.nom.trim());

  const selectedRaison = raisonsOptions.find(
    (option) => option.value === raisons
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg border border-gray-200">
        {/* Header - Modèle VIPNET */}
        <div className="border-b-2 border-gray-800 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-black text-white px-3 py-2 font-bold text-lg">
                VIPNET
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 uppercase">
                  Fiche de matériels
                </h1>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Ouagadougou le{" "}
                {new Date().toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Première ligne - N°, Raisons, Destinat/prov */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-gray-300 pb-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 min-w-0">
                N°
              </label>
              <div className="flex-1 border-b border-gray-400 pb-1">
                <span className="text-sm text-gray-500">Auto-généré</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 min-w-0">
                Raisons :
              </label>
              <div className="flex-1 border-b border-gray-400 pb-1">
                <select
                  value={raisons}
                  onChange={(e) => setRaisons(e.target.value)}
                  className={`w-full text-sm border-none focus:ring-0 focus:outline-none bg-transparent font-medium ${
                    selectedRaison?.color || "text-red-600"
                  }`}
                >
                  {raisonsOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="text-gray-900"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 min-w-0">
                Destinat/prov
              </label>
              <div className="flex-1 border-b border-gray-400 pb-1">
                <input
                  type="text"
                  value={destinataire}
                  onChange={(e) => setDestinataire(e.target.value)}
                  placeholder="Client ou provenance"
                  className="w-full text-sm border-none focus:ring-0 focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Deuxième ligne - Demandeur */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-gray-300 pb-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 min-w-0">
                Demandeur
              </label>
              <div className="flex-1 border-b border-gray-400 pb-1">
                <div className="text-sm text-gray-900">{user?.fullName}</div>
                <div className="text-xs text-gray-500">
                  {user?.position} - {user?.department}
                </div>
              </div>
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-gray-300 pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du client / département VIPNET-BF *
              </label>
              <input
                type="text"
                name="client"
                required
                value={formData.client}
                onChange={handleChange}
                placeholder="Nom du client ou département"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            {/*  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Département concerné *
              </label>
              <input
                type="text"
                name="departement"
                required
                value={formData.departement}
                onChange={handleChange}
                placeholder="Département concerné"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>*/}
          </div>
          {/* Tableau des matériels */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Matériels</h3>
              <button
                type="button"
                onClick={addMaterielRow}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une ligne
              </button>
            </div>

            <div className="border border-gray-400 rounded-lg overflow-hidden">
              {/* En-tête du tableau */}
              <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-400">
                <div className="col-span-5 p-3 border-r border-gray-400">
                  <span className="text-sm font-medium text-gray-700">
                    Matériels *
                  </span>
                </div>
                <div className="col-span-3 p-3 border-r border-gray-400">
                  <span className="text-sm font-medium text-gray-700">
                    État
                  </span>
                </div>
                <div className="col-span-3 p-3 border-r border-gray-400">
                  <span className="text-sm font-medium text-gray-700">
                    N° Séries
                  </span>
                </div>
                <div className="col-span-1 p-3">
                  <span className="text-sm font-medium text-gray-700">
                    Action
                  </span>
                </div>
              </div>

              {/* Lignes de matériels */}
              {materiels.map((materiel, index) => {
                const selectedEtat = etatOptions.find(
                  (option) => option.value === materiel.etat
                );

                return (
                  <div
                    key={materiel.id}
                    className="grid grid-cols-12 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-5 p-3 border-r border-gray-400">
                      <textarea
                        value={materiel.nom}
                        onChange={(e) =>
                          updateMateriel(materiel.id, "nom", e.target.value)
                        }
                        placeholder="Description du matériel..."
                        rows={2}
                        className="w-full text-sm border-none focus:ring-0 focus:outline-none bg-transparent resize-none placeholder-gray-400"
                      />
                    </div>
                    <div className="col-span-3 p-3 border-r border-gray-400">
                      <select
                        value={materiel.etat}
                        onChange={(e) =>
                          updateMateriel(materiel.id, "etat", e.target.value)
                        }
                        className={`w-full text-sm border-none focus:ring-0 focus:outline-none bg-transparent font-medium ${
                          selectedEtat?.color || "text-gray-900"
                        }`}
                      >
                        {etatOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="text-gray-900"
                          >
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3 p-3 border-r border-gray-400">
                      <input
                        type="text"
                        value={materiel.numeroSerie}
                        onChange={(e) =>
                          updateMateriel(
                            materiel.id,
                            "numeroSerie",
                            e.target.value
                          )
                        }
                        placeholder="N° de série"
                        className="w-full text-sm border-none focus:ring-0 focus:outline-none bg-transparent placeholder-gray-400"
                      />
                    </div>
                    <div className="col-span-1 p-3 flex justify-center items-center">
                      {materiels.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMaterielRow(materiel.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Résumé des matériels */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Résumé
                </span>
              </div>
              <div className="text-sm text-blue-800">
                <span className="font-medium">
                  {materiels.filter((m) => m.nom.trim()).length}
                </span>{" "}
                matériel(s) saisi(s)
                {materiels.filter((m) => m.nom.trim()).length > 0 && (
                  <span className="ml-2">
                    • États:{" "}
                    {[
                      ...new Set(
                        materiels.filter((m) => m.nom.trim()).map((m) => m.etat)
                      ),
                    ].join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Options supplémentaires */}
          <div className="flex items-center space-x-6 pt-4 border-t border-gray-200">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isInternal"
                checked={formData.isInternal}
                onChange={handleChange}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Fiche interne
              </span>
            </label>

            <div className="text-sm text-gray-500">
              Type:{" "}
              <span className={`font-medium ${selectedRaison?.color}`}>
                {selectedRaison?.label}
              </span>
            </div>
          </div>

          {/* Section Signatures (aperçu) */}
          <div className="border-t-2 border-gray-800 pt-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-orange-600 uppercase">
                Signatures
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Les signatures seront disponibles après la création de la fiche
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 border border-gray-400 bg-gray-50 rounded-lg">
              {/* Aperçu des zones de signature */}
              <div className="border-r border-gray-400 p-4 text-center">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Demandeur : <span className="text-red-500">*</span>
                </div>
                <div className="h-16 border-b border-gray-300 mb-2 bg-white rounded"></div>
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleDateString("fr-FR")}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {user?.fullName}
                </div>
              </div>

              <div className="border-r border-gray-400 p-4 text-center lg:border-r-0">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Supérieur Hiérarch
                </div>
                <div className="h-16 border-b border-gray-300 mb-2 bg-white rounded"></div>
                <div className="text-xs text-gray-500">Date</div>
                <div className="text-xs text-gray-600 mt-1">Nom</div>
              </div>

              <div className="col-span-2 lg:col-span-1 border-r border-gray-400 lg:border-r-0 p-4">
                <div className="grid grid-cols-2 h-full gap-2">
                  <div className="text-center border-r border-gray-300 pr-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Gestion qualité
                    </div>
                    <div className="h-12 bg-white rounded"></div>
                  </div>
                  <div className="text-center pl-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Contrôle gestion
                    </div>
                    <div className="h-12 bg-white rounded"></div>
                  </div>
                </div>
                <div className="text-center mt-2 pt-2 border-t border-gray-300">
                  <div className="text-sm font-medium text-gray-700">
                    Directeur Filiale
                  </div>
                  <div className="h-12 border-b border-gray-300 bg-white rounded"></div>
                </div>
              </div>

              {/* Deuxième ligne */}
              <div className="col-span-2 lg:col-span-3 border-t border-gray-400 p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Magasinier
                    </div>
                    <div className="h-16 border-b border-gray-300 bg-white rounded"></div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Directeur Général :{" "}
                      <span className="text-red-500">*</span>
                    </div>
                    <div className="h-16 border-b border-gray-300 bg-white rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? "Création..." : "Créer la fiche"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FDPForm;
