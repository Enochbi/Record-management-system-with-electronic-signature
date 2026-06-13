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
}

export enum UserRole {
  ADMIN = "admin",
  DEMANDEUR = "demandeur",
  OPERATIONS = "operations",       // conservé pour compatibilité DB mais non utilisé dans le workflow
  FOURNISSEUR = "fournisseur",     // conservé pour compatibilité DB mais non utilisé dans le workflow
  CHEF_SERVICE = "superieur_hierarchique",
  RESPONSABLE_FINANCIER = "tresorerie",     // conservé pour compatibilité DB
  RESPONSABLE_COMPTABLE = "comptabilite",
  DIRECTEUR_GENERAL = "directeur_general",
  CAISSE = "caisse",
  CONTROLE_QUALITE = "Controle_Qualite",
  CONTROLE_GESTION = "Controle_Gestion",
  MAGASINIER = "Magasinier",
}

export enum FDPStatus {
  DRAFT = "draft",
  PENDING_OPERATIONS = "pending_operations",           // informationnel uniquement
  PENDING_CHEF_SERVICE = "pending_superieur_hierarchique",
  PENDING_RESPONSABLE_FINANCIER = "pending_tresorerie",  // informationnel uniquement
  PENDING_RESPONSABLE_COMPTABLE = "pending_comptabilite",
  PENDING_DIRECTEUR_GENERAL = "pending_directeur_general",
  PENDING_CAISSE = "pending_caisse",
  COMPLETED = "completed",
  REJECTED = "rejected",
  PENDING = "pending",
}

export enum PaymentMethod {
  VIREMENT = "virement_bancaire",
  CHEQUE_BARRE = "chèque_barré",
  CHEQUE_NON_BARRE = "chèque_non_barré",
  ESPECES = "espèces",
  MONNAIE_ELECTRONIQUE = "monnaie_électronique",
  AUTRE = "autre",
}

export interface Department {
  id: string;
  name: string;
}

export interface FDP {
  id: number;
  reference: string;
  creation_date: string;
  requester_id: number;
  requester_name: string;
  requester_position: string;
  type_description: string;
  requester_department: string;
  requester_phone: string;
  requester_email: string;
  description: string;
  amount: number | null;
  validated_amount: number | null;
  payment_method: PaymentMethod;
  payment_reference: string;
  status: FDPStatus;

  // ── Signatures actives (visibles dans l'UI) ──────────────────────────
  requester_signature: string | null;
  superieur_hierarchique_signature: string | null;
  comptabilite_signature: string | null;
  directeur_general_signature: string | null;
  caisse_signature: string | null;

  // ── Dates de signatures actives ──────────────────────────────────────
  requester_signature_date: string | null;
  superieur_hierarchique_signature_date: string | null;
  comptabilite_signature_date: string | null;
  directeur_general_signature_date: string | null;
  caisse_signature_date: string | null;

  // ── Champs conservés pour compatibilité DB (non affichés) ────────────
  operations_signature?: string | null;
  operations_signature_date?: string | null;
  fournisseur_signature?: string | null;
  fournisseur_signature_date?: string | null;
  tresorerie_signature?: string | null;
  tresorerie_signature_date?: string | null;

  // ── Rejet ─────────────────────────────────────────────────────────────
  rejection_reason: string | null;
  rejected_by: string | null;
  rejection_date: string | null;

  // ── Départements ──────────────────────────────────────────────────────
  department_source: string;
  department_destination: string[];
}

export interface SignatureAction {
  fdpId: number;
  signature: string;
  role: UserRole;
  approved: boolean;
  rejectionReason?: string;
  validatedAmount?: number;
  selectedRole?: UserRole;
}