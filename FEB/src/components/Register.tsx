import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Building2, Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { UserRole } from "../types";
import toast from "react-hot-toast";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    position: "",
    department: "",
    phoneNumber: "",
    role: "demandeur" as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const roles: { value: UserRole; label: string; description: string }[] = [
    {
      value: "demandeur",
      label: "Demandeur",
      description: "Peut créer et gérer ses propres fiches",
    },
    /*{
      value: "admin",
      label: "admin ",
      description: "admin ",
    },
    {
      value: "directeur_general",
      label: "Directeur Général",
      description: "Signature finale et validation des fiches",
    },
    {
      value: "superieur_hierarchique",
      label: "Supérieur Hiérarchique",
      description: "Supervision et validation intermédiaire",
    },
    {
      value: "Controle_Qualite",
      label: "Contrôle Qualité",
      description: "Vérification qualité des matériels",
    },
    {
      value: "Controle_Gestion",
      label: "Contrôle Gestion",
      description: "Contrôle financier et budgétaire",
    },
    {
      value: "Magasinier",
      label: "Magasinier",
      description: "Gestion des stocks et inventaires",
    },*/
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validation du nom d'utilisateur
    if (!formData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (formData.username.length < 3) {
      newErrors.username =
        "Le nom d'utilisateur doit contenir au moins 3 caractères";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores";
    }

    // Validation de l'email
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide";
    }

    // Validation du mot de passe
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 6) {
      newErrors.password =
        "Le mot de passe doit contenir au moins 6 caractères";
    }

    // Validation de la confirmation du mot de passe
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "La confirmation du mot de passe est requise";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    // Validation du nom complet
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Le nom complet est requis";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Le nom complet doit contenir au moins 2 caractères";
    }

    // Validation du poste
    if (!formData.position.trim()) {
      newErrors.position = "Le poste est requis";
    }

    // Validation du département
    if (!formData.department.trim()) {
      newErrors.department = "Le département est requis";
    }

    // Validation du numéro de téléphone (optionnel mais format si fourni)
    if (
      formData.phoneNumber &&
      !/^[\+]?[0-9\s\-\(\)]{8,}$/.test(formData.phoneNumber)
    ) {
      newErrors.phoneNumber = "Format de numéro de téléphone invalide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log("📝 Tentative d'inscription avec:", {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        fullName: formData.fullName,
      });

      await register({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        role: formData.role,
      });

      toast.success(
        "Inscription réussie ! Vous pouvez maintenant vous connecter."
      );
      navigate("/login");
    } catch (error: any) {
      console.error("❌ Erreur d'inscription:", error);

      // Gestion des erreurs spécifiques
      if (error.response?.status === 400) {
        const message = error.response.data?.message || "Données invalides";
        if (message.includes("username") || message.includes("utilisateur")) {
          setErrors({ username: "Ce nom d'utilisateur est déjà utilisé" });
        } else if (message.includes("email")) {
          setErrors({ email: "Cet email est déjà utilisé" });
        } else {
          toast.error(message);
        }
      } else if (error.response?.status === 500) {
        toast.error("Erreur serveur. Veuillez réessayer plus tard.");
      } else {
        toast.error("Erreur de connexion. Vérifiez votre connexion internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Effacer l'erreur pour ce champ quand l'utilisateur commence à taper
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const getFieldError = (fieldName: string) => {
    return errors[fieldName] ? (
      <div className="flex items-center mt-1 text-sm text-red-600">
        <AlertCircle className="w-4 h-4 mr-1" />
        {errors[fieldName]}
      </div>
    ) : null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Building2 className="h-12 w-12 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">VIPNET</h1>
                <p className="text-sm text-gray-500">Système FGM</p>
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Rejoignez le système de gestion des fiches matériel
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nom complet */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Nom complet *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                  errors.fullName ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="Entrez votre nom complet"
              />
              {getFieldError("fullName")}
            </div>

            {/* Nom d'utilisateur */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Nom d'utilisateur *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                  errors.username ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="Choisissez un nom d'utilisateur"
              />
              {getFieldError("username")}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                  errors.email ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="Entrez votre email"
              />
              {getFieldError("email")}
            </div>

            {/* Poste et Département */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-gray-700"
                >
                  Poste *
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  required
                  value={formData.position}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                    errors.position ? "border-red-300" : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Votre poste"
                />
                {getFieldError("position")}
              </div>

              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700"
                >
                  Département *
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                    errors.department ? "border-red-300" : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Votre département"
                />
                {getFieldError("department")}
              </div>
            </div>

            {/* Numéro de téléphone */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Numéro de téléphone
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-3 border ${
                  errors.phoneNumber ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="+226 70 XX XX XX"
              />
              {getFieldError("phoneNumber")}
            </div>

            {/* Rôle */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                Rôle *
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Mot de passe *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                    errors.password ? "border-red-300" : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Choisissez un mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {getFieldError("password")}
            </div>

            {/* Confirmation du mot de passe */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirmer le mot de passe *
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                    errors.confirmPassword
                      ? "border-red-300"
                      : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Confirmez votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {getFieldError("confirmPassword")}
            </div>
          </div>

          {/* Bouton de soumission */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <UserPlus className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" />
              </span>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création en cours...
                </div>
              ) : (
                "Créer le compte"
              )}
            </button>
          </div>

          {/* Lien vers la connexion */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{" "}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
