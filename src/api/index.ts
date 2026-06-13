import { User, FDP, SignatureAction, UserRole } from "../types";

const API_URL = "/api";

// Type pour les options de requête
type FetchOptions = {
  signal?: AbortSignal;
};

// Helper function to get token
const getToken = (): string => {
  const user = localStorage.getItem("user");
  if (!user) {
    console.error("Aucun utilisateur trouvé dans localStorage");
    return "";
  }

  try {
    const userData = JSON.parse(user);
    return userData.token || "";
  } catch (error) {
    console.error("Erreur lors de la récupération du token:", error);
    return "";
  }
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || "Erreur serveur");
    } catch (e) {
      throw new Error("Erreur de communication avec le serveur");
    }
  }
  return response.json();
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (
  url: string,
  options: RequestInit & FetchOptions = {}
): Promise<any> => {
  const token = getToken();
  if (!token) throw new Error("Non authentifié");

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  return handleResponse(response);
};

// Auth API
export const loginUser = async (
  username: string,
  password: string
): Promise<User> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  return handleResponse(response);
};

// Ajouter cette fonction avec les autres exports
export const registerUser = async (userData: {
  username: string;
  password: string;
  email: string;
  full_name: string;
  role: string;
  position: string;
  department: string;
  phone_number?: string;
}) => {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.error === "Utilisateur existe déjà") {
      if (data.conflict?.username) {
        throw new Error("Ce nom d'utilisateur est déjà utilisé");
      }
      if (data.conflict?.email) {
        throw new Error("Cet email est déjà utilisé");
      }
    }
    throw new Error(data.error || "Erreur lors de l'inscription");
  }

  return data;
};

// FDP API
export const createFDP = async (fdpData: Partial<FDP>): Promise<FDP> => {
  return makeAuthenticatedRequest("/fdp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fdpData),
  });
};

export const updateFDP = async (
  id: number,
  fdpData: Partial<FDP>
): Promise<FDP> => {
  return makeAuthenticatedRequest(`/fdp/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fdpData),
  });
};

export const getFDP = async (
  id: number,
  options?: FetchOptions
): Promise<FDP> => {
  const data = await makeAuthenticatedRequest(`/fdp/${id}`, {
    ...options,
  });
  return {
    ...data,
    requesterName: data.requester_name,
  };
};

export const getAllFDPs = async (options?: FetchOptions): Promise<FDP[]> => {
  const data = await makeAuthenticatedRequest("/fdp", {
    ...options,
  });
  return data.map((fdp: any) => ({
    ...fdp,
    requesterName: fdp.requester_name,
  }));
};

export const getMyFDPs = async (options?: FetchOptions): Promise<FDP[]> => {
  const data = await makeAuthenticatedRequest("/fdp/mine", {
    ...options,
  });
  return data.map((fdp: any) => ({
    ...fdp,
    requesterName: fdp.requester_name,
  }));
};

export const getMyPendingFDPs = async (
  role: string,
  options?: FetchOptions
): Promise<FDP[]> => {
  const data = await makeAuthenticatedRequest(`/fdp/pending/${role}`, {
    ...options,
  });

  // Si l'utilisateur est le DG, filtrer les fiches sans signature DG
  if (role === UserRole.DIRECTEUR_GENERAL) {
    return data
      .filter((fdp: any) => !fdp.directeur_general_signature) // Filtrer les fiches sans signature DG
      .map((fdp: any) => ({
        ...fdp,
        requesterName: fdp.requester_name,
      }));
  }

  // Pour les autres rôles, retourner les fiches normalement
  return data.map((fdp: any) => ({
    ...fdp,
    requesterName: fdp.requester_name,
  }));
};

export const deleteFDP = async (id: number): Promise<void> => {
  return makeAuthenticatedRequest(`/fdp/${id}`, {
    method: "DELETE",
  });
};

  export const signFDP = async (signatureData: SignatureAction): Promise<FDP> => {
    // Ajouter le rôle sélectionné dans la requête
    const data = await makeAuthenticatedRequest(
      `/fdp/${signatureData.fdpId}/sign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...signatureData,
          selectedRole: signatureData.selectedRole // Ajout crucial
        }),
      }
    );
    return {
      ...data,
      requesterName: data.requester_name,
    };
  };
