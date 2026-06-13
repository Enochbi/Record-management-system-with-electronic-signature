export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  position: string;
  department: string;
  phoneNumber: string;
  token: string;
  createdAt: string;
}

export type UserRole =
  | "admin" // Nouveau rôle
  | "demandeur"
  | "directeur_general"
  | "superieur_hierarchique"
  | "Controle_Qualite"
  | "Controle_Gestion"
  | "Magasinier";

export interface Fiche {
  id: number;
  demandeurId: number;
  demandeur: User;
  dateCreation: string;
  client: string;
  departement: string;
  description: string;
  status: FicheStatus;
  isInternal: boolean;
  raisons?: string;
  destinataire?: string;
  etat?: string;
  numeroSeries?: string;
  signatures: Signature[];
  createdAt: string;
  updatedAt: string;
}

export type FicheStatus = "Brouillon" | "En_Attente" | "Signe" | "Valide";

export interface Signature {
  id: number;
  ficheId: number;
  userId: number;
  user: User;
  role: UserRole;
  signatureData: string;
  isObligatory: boolean;
  signedAt: string | null;
  createdAt: string;
}

export interface SignatureRequirement {
  role: UserRole;
  isObligatory: boolean;
  displayName: string;
}

export interface FicheFormData {
  client: string;
  departement: string;
  description: string;
  isInternal: boolean;
  raisons?: string;
  destinataire?: string;
  etat?: string;
  numeroSeries?: string;
}

export interface MaterialItem {
  id: string;
  nom: string;
  etat: string;
  numeroSerie: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  position: string;
  department: string;
  phoneNumber: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
