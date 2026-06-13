import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../api";
import { useAuth } from "../context/AuthContext";
import { 
  Lock, User, Mail, Briefcase, Phone, UserPlus, 
  ArrowLeft, FileText, Package, ArrowRight 
} from "lucide-react";

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<"fdp" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const roles = ["demandeur"];
  const departments = [
    "Technique", "Commercial", "Finance", 
    "Ressources Humaines", "Informatique", "Direction", "Autre"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegistering) {
      if (!username || !password || !email || !fullName || !role || !position || !department) {
        setError("Veuillez remplir tous les champs obligatoires");
        return;
      }
    } else if (!username || !password || !selectedSystem) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      setLoading(true);
      
      if (isRegistering) {
        await registerUser({
          username, password, email,
          full_name: fullName, role, position,
          department, phone_number: phoneNumber
        });
        alert("Compte créé avec succès! Veuillez vous connecter.");
        setIsRegistering(false);
      } else {
        const userData = await loginUser(username, password);
        login(userData);
        window.location.href = "http://197.159.195.207:5173";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedSystem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">VIPNET Portal</h1>
            <p className="text-gray-600">Tableau de bord principal</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Carte FDP */}
            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => setSelectedSystem("fdp")}
            >
              <div className="p-5">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 text-blue-800 p-2 rounded-lg mr-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Système de gestion des fiches de demande de paiement</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Système de gestion des fiches de demande de paiement avec workflow numérique sécurisé.
                </p>
                
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <p className="text-gray-600">
                    <span className="font-medium">Adresse :</span>
                    <a href="http://197.159.195.207:5173" target="_blank" rel="noopener noreferrer"
                       className="ml-1 text-blue-600 hover:underline block truncate">
                      http://197.159.195.207:5173
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Carte Matériel - Modified section */}
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => window.location.href = "http://197.159.195.207:5174"}
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-5">
                <div className="flex items-center mb-3">
                  <div className="bg-indigo-100 text-indigo-800 p-2 rounded-lg mr-3">
                    <Package className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Gestion des fiches Matériels</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Plateforme de gestion des fiches d'entrée/sortie de matériel avec workflow sécurisé.
                </p>
                
                {/* Updated address block */}
                <div className="bg-gray-50 p-3 rounded-lg mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Adresse:</span>
                    <a
                      href="http://197.159.195.207:5174"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline"
                    >
                      http://197.159.195.207:5174
                    </a>
                  </p>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 mb-4">
              Sélectionnez un système pour vous connecter
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <button
            onClick={() => setSelectedSystem(null)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </button>
          
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Système de gestion des paiements
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegistering && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nom complet"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom d'utilisateur"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mot de passe"
                />
              </div>
            </div>

            {isRegistering && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionnez un rôle</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poste
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="pl-9 w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Votre poste"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Département
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionnez un département</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone (optionnel)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-9 w-full text-sm border border-gray-300 rounded py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Numéro de téléphone"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded text-sm font-medium ${
                loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {loading
                ? isRegistering ? "Création..." : "Connexion..."
                : isRegistering ? "Créer un compte" : "Se connecter"}
            </button>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                {isRegistering ? "Déjà un compte? Se connecter" : "Créer un nouveau compte"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;