/*
  # Système de Gestion des Fiches Matériel (FGM) - VIPNET
  # Base de données PostgreSQL complète
  
  ## Structure de la base de données
  
  1. Tables principales
     - `users` : Gestion des utilisateurs et rôles
     - `fiches_tec` : Fiches de sortie/entrée de matériel
     - `signatures_tec` : Signatures électroniques pour chaque fiche
  
  2. Fonctionnalités
     - Listes déroulantes pour raisons et états
     - Workflow de signatures obligatoires/optionnelles
     - Utilisateurs de test avec mots de passe hashés
     - Triggers automatiques pour les timestamps
     - Fonctions pour le workflow
  
  3. Utilisateurs de test (mot de passe: password123)
     - admin / directeur_general
     - demandeur1 / demandeur
     - magasinier1 / Magasinier
     - controleur1 / Controle_Qualite
     - gestionnaire1 / Controle_Gestion
     - superieur1 / superieur_hierarchique
*/

-- Suppression des tables existantes si elles existent
DROP TABLE IF EXISTS signatures_tec CASCADE;
DROP TABLE IF EXISTS fiches_tec CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Suppression des fonctions et triggers existants
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS create_fiche_with_signatures(INTEGER, VARCHAR, VARCHAR, TEXT, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS validate_signature_workflow(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_fiche_status_on_signature() CASCADE;
DROP FUNCTION IF EXISTS get_fiche_stats(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_next_required_signer(INTEGER) CASCADE;

-- Suppression des vues existantes
DROP VIEW IF EXISTS fiche_statistics CASCADE;
DROP VIEW IF EXISTS signature_workflow CASCADE;
DROP VIEW IF EXISTS fiches_complete CASCADE;

-- ============================================================================
-- CRÉATION DES TABLES
-- ============================================================================

-- Table des utilisateurs
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'demandeur', 
    'directeur_general', 
    'superieur_hierarchique', 
    'Controle_Qualite', 
    'Controle_Gestion', 
    'Magasinier'
  )),
  position VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des fiches techniques
CREATE TABLE fiches_tec (
  id SERIAL PRIMARY KEY,
  demandeur_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  client VARCHAR(255) NOT NULL,
  departement VARCHAR(255),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Brouillon' CHECK (status IN (
    'Brouillon', 
    'En_Attente', 
    'Signe', 
    'Valide'
  )),
  is_internal BOOLEAN DEFAULT FALSE,
  raisons VARCHAR(255) DEFAULT 'Entrée de matériels' CHECK (raisons IN (
    'Entrée de matériels',
    'Sortie de matériels',
    'Transfert de matériels',
    'Maintenance de matériels',
    'Retour de matériels',
    'Réparation de matériels',
    'Inventaire de matériels'
  )),
  destinataire VARCHAR(255),
  etat VARCHAR(100) DEFAULT 'bon' CHECK (etat IN (
    'neuf',
    'bon',
    'moyen',
    'usagé',
    'défaillant',
    'à réparer',
    'hors service',
    'en maintenance'
  )),
  numero_series VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des signatures
CREATE TABLE signatures_tec (
  id SERIAL PRIMARY KEY,
  fiche_id INTEGER REFERENCES fiches_tec(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'demandeur', 
    'directeur_general', 
    'superieur_hierarchique', 
    'Controle_Qualite', 
    'Controle_Gestion', 
    'Magasinier'
  )),
  signature_data TEXT, -- Base64 image data
  is_obligatory BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- ============================================================================

-- Index pour la table users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Index pour la table fiches_tec
CREATE INDEX idx_fiches_tec_demandeur ON fiches_tec(demandeur_id);
CREATE INDEX idx_fiches_tec_status ON fiches_tec(status);
CREATE INDEX idx_fiches_tec_created_at ON fiches_tec(created_at);
CREATE INDEX idx_fiches_tec_date_creation ON fiches_tec(date_creation);
CREATE INDEX idx_fiches_tec_raisons ON fiches_tec(raisons);

-- Index pour la table signatures_tec
CREATE INDEX idx_signatures_tec_fiche ON signatures_tec(fiche_id);
CREATE INDEX idx_signatures_tec_user ON signatures_tec(user_id);
CREATE INDEX idx_signatures_tec_role ON signatures_tec(role);
CREATE INDEX idx_signatures_tec_signed_at ON signatures_tec(signed_at);

-- Index composé pour éviter les signatures multiples du même rôle sur une fiche
CREATE UNIQUE INDEX idx_unique_fiche_role_signature 
ON signatures_tec(fiche_id, role) 
WHERE signed_at IS NOT NULL;

-- ============================================================================
-- FONCTIONS ET TRIGGERS
-- ============================================================================

-- Fonction pour mise à jour automatique des timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mise à jour automatique des timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiches_tec_updated_at 
    BEFORE UPDATE ON fiches_tec 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer une nouvelle fiche avec ses signatures
CREATE OR REPLACE FUNCTION create_fiche_with_signatures(
  p_demandeur_id INTEGER,
  p_client VARCHAR(255),
  p_departement VARCHAR(255),
  p_description TEXT,
  p_is_internal BOOLEAN DEFAULT FALSE,
  p_raisons VARCHAR(255) DEFAULT 'Entrée de matériels',
  p_destinataire VARCHAR(255) DEFAULT NULL,
  p_etat VARCHAR(100) DEFAULT 'bon',
  p_numero_series VARCHAR(255) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_fiche_id INTEGER;
  v_signature_roles TEXT[] := ARRAY[
    'demandeur',
    'superieur_hierarchique',
    'Controle_Qualite',
    'Controle_Gestion',
    'Magasinier',
    'directeur_general'
  ];
  v_obligatory_roles TEXT[] := ARRAY['demandeur', 'directeur_general'];
  v_role TEXT;
BEGIN
  -- Créer la fiche
  INSERT INTO fiches_tec (
    demandeur_id, 
    client, 
    departement, 
    description, 
    is_internal,
    raisons,
    destinataire,
    etat,
    numero_series
  )
  VALUES (
    p_demandeur_id, 
    p_client, 
    p_departement, 
    p_description, 
    p_is_internal,
    p_raisons,
    p_destinataire,
    p_etat,
    p_numero_series
  )
  RETURNING id INTO v_fiche_id;
  
  -- Créer les enregistrements de signature
  FOREACH v_role IN ARRAY v_signature_roles
  LOOP
    INSERT INTO signatures_tec (fiche_id, role, is_obligatory)
    VALUES (v_fiche_id, v_role, v_role = ANY(v_obligatory_roles));
  END LOOP;
  
  RETURN v_fiche_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider le workflow de signatures
CREATE OR REPLACE FUNCTION validate_signature_workflow(p_fiche_id INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_obligatory_count INTEGER;
  v_signed_obligatory_count INTEGER;
  v_new_status VARCHAR(20);
BEGIN
  -- Compter les signatures obligatoires
  SELECT COUNT(*) INTO v_obligatory_count
  FROM signatures_tec 
  WHERE fiche_id = p_fiche_id AND is_obligatory = TRUE;
  
  -- Compter les signatures obligatoires signées
  SELECT COUNT(*) INTO v_signed_obligatory_count
  FROM signatures_tec 
  WHERE fiche_id = p_fiche_id AND is_obligatory = TRUE AND signed_at IS NOT NULL;
  
  -- Déterminer le nouveau statut
  IF v_signed_obligatory_count = 0 THEN
    v_new_status := 'Brouillon';
  ELSIF v_signed_obligatory_count = 1 THEN
    v_new_status := 'En_Attente';
  ELSIF v_signed_obligatory_count = v_obligatory_count THEN
    v_new_status := 'Valide';
  ELSE
    v_new_status := 'Signe';
  END IF;
  
  -- Mettre à jour le statut de la fiche
  UPDATE fiches_tec SET status = v_new_status WHERE id = p_fiche_id;
  
  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mise à jour automatique du status après signature
CREATE OR REPLACE FUNCTION update_fiche_status_on_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- Si une signature a été ajoutée/modifiée
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.signed_at IS NOT NULL THEN
    PERFORM validate_signature_workflow(NEW.fiche_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_status_trigger
  AFTER INSERT OR UPDATE ON signatures_tec
  FOR EACH ROW
  EXECUTE FUNCTION update_fiche_status_on_signature();

-- Fonction utilitaire pour obtenir les statistiques d'une fiche
CREATE OR REPLACE FUNCTION get_fiche_stats(p_fiche_id INTEGER)
RETURNS TABLE(
  total_signatures INTEGER,
  signed_signatures INTEGER,
  obligatory_signatures INTEGER,
  obligatory_signed INTEGER,
  completion_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_signatures,
    COUNT(CASE WHEN signed_at IS NOT NULL THEN 1 END)::INTEGER as signed_signatures,
    COUNT(CASE WHEN is_obligatory = TRUE THEN 1 END)::INTEGER as obligatory_signatures,
    COUNT(CASE WHEN is_obligatory = TRUE AND signed_at IS NOT NULL THEN 1 END)::INTEGER as obligatory_signed,
    ROUND(
      (COUNT(CASE WHEN signed_at IS NOT NULL THEN 1 END)::DECIMAL / 
       NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 
      2
    ) as completion_percentage
  FROM signatures_tec 
  WHERE fiche_id = p_fiche_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le prochain signataire requis
CREATE OR REPLACE FUNCTION get_next_required_signer(p_fiche_id INTEGER)
RETURNS TABLE(
  role VARCHAR(50),
  is_obligatory BOOLEAN,
  display_name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.role,
    s.is_obligatory,
    CASE s.role
      WHEN 'demandeur' THEN 'Demandeur'
      WHEN 'directeur_general' THEN 'Directeur Général'
      WHEN 'superieur_hierarchique' THEN 'Supérieur Hiérarchique'
      WHEN 'Controle_Qualite' THEN 'Contrôle Qualité'
      WHEN 'Controle_Gestion' THEN 'Contrôle Gestion'
      WHEN 'Magasinier' THEN 'Magasinier'
      ELSE s.role
    END as display_name
  FROM signatures_tec s
  WHERE s.fiche_id = p_fiche_id 
    AND s.signed_at IS NULL 
    AND s.is_obligatory = TRUE
  ORDER BY 
    CASE s.role
      WHEN 'demandeur' THEN 1
      WHEN 'directeur_general' THEN 2
      ELSE 3
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VUES POUR LES STATISTIQUES ET RAPPORTS
-- ============================================================================

-- Vue pour les statistiques
CREATE OR REPLACE VIEW fiche_statistics AS
SELECT 
  COUNT(*) as total_fiches,
  COUNT(CASE WHEN status = 'Brouillon' THEN 1 END) as brouillons,
  COUNT(CASE WHEN status = 'En_Attente' THEN 1 END) as en_attente,
  COUNT(CASE WHEN status = 'Valide' THEN 1 END) as validees,
  DATE_TRUNC('month', created_at) as mois
FROM fiches_tec
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mois DESC;

-- Vue pour le workflow des signatures
CREATE OR REPLACE VIEW signature_workflow AS
SELECT 
  f.id as fiche_id,
  f.client,
  f.status as fiche_status,
  s.role,
  s.is_obligatory,
  s.signed_at,
  u.full_name as signataire,
  u.position,
  u.department,
  CASE 
    WHEN s.signed_at IS NOT NULL THEN 'Signé'
    WHEN s.is_obligatory THEN 'Requis'
    ELSE 'Optionnel'
  END as signature_status
FROM fiches_tec f
LEFT JOIN signatures_tec s ON f.id = s.fiche_id
LEFT JOIN users u ON s.user_id = u.id
ORDER BY f.id, s.is_obligatory DESC, s.role;

-- Vue pour les fiches avec détails complets
CREATE OR REPLACE VIEW fiches_complete AS
SELECT 
  f.*,
  u.full_name as demandeur_name,
  u.position as demandeur_position,
  u.department as demandeur_department,
  u.email as demandeur_email,
  u.phone_number as demandeur_phone,
  COUNT(s.id) as total_signatures,
  COUNT(CASE WHEN s.signed_at IS NOT NULL THEN 1 END) as signed_count,
  COUNT(CASE WHEN s.is_obligatory = TRUE AND s.signed_at IS NOT NULL THEN 1 END) as obligatory_signed
FROM fiches_tec f
JOIN users u ON f.demandeur_id = u.id
LEFT JOIN signatures_tec s ON f.id = s.fiche_id
GROUP BY f.id, u.id, u.full_name, u.position, u.department, u.email, u.phone_number
ORDER BY f.created_at DESC;

-- ============================================================================
-- INSERTION DES UTILISATEURS DE TEST
-- ============================================================================

-- Utilisateurs de test avec mots de passe hashés (password123)
INSERT INTO users (
  username, 
  email, 
  password, 
  full_name, 
  role, 
  position, 
  department, 
  phone_number
) VALUES
-- Directeur Général
(
  'admin', 
  'admin@vipnet.bf', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'Administrateur Système', 
  'directeur_general',
  'Directeur Général',
  'Direction Générale',
  '+226 70 00 00 00'
),
-- Demandeur
(
  'demandeur1', 
  'demandeur1@vipnet.bf', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'Jean Ouédraogo', 
  'demandeur',
  'Technicien IT',
  'Informatique',
  '+226 70 11 11 11'
),
-- Magasinier
(
  'magasinier1', 
  'magasinier@vipnet.bf', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'Marie Sawadogo', 
  'Magasinier',
  'Responsable Magasin',
  'Logistique',
  '+226 70 22 22 22'
),
-- Contrôle Qualité
(
  'controleur1', 
  'controle@vipnet.bf', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'Paul Kaboré', 
  'Controle_Qualite',
  'Contrôleur Qualité',
  'Qualité',
  '+226 70 33 33 33'
),
-- Contrôle Gestion
(
  'gestionnaire1', 
  'gestion@vipnet.bf', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'Fatou Traoré', 
  'Controle_Gestion',
  'Contrôleur de Gestion',
  'Finance',
  '+226 70 44 44 44'
),
-- Supérieur Hiérarchique
(
  'superieur1', 
  'superieur@vipnet.bf', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'Amadou Diallo', 
  'superieur_hierarchique',
  'Chef de Service',
  'Technique',
  '+226 70 55 55 55'
)
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- DONNÉES D'EXEMPLE (OPTIONNEL)
-- ============================================================================

-- Exemple de fiche pour démonstration
DO $$
DECLARE
  v_fiche_id INTEGER;
  v_demandeur_id INTEGER;
BEGIN
  -- Récupérer l'ID du demandeur
  SELECT id INTO v_demandeur_id FROM users WHERE username = 'demandeur1';
  
  IF v_demandeur_id IS NOT NULL THEN
    -- Créer une fiche d'exemple
    SELECT create_fiche_with_signatures(
      v_demandeur_id,
      'Client Test SARL',
      'Informatique',
      'Ordinateur portable Dell Latitude 5520 (État: neuf, N° série: DL5520-001)
Souris optique Logitech (État: bon, N° série: LG-M001)
Clavier sans fil (État: bon)',
      FALSE,
      'Entrée de matériels',
      'Fournisseur IT Solutions',
      'bon',
      'DL5520-001, LG-M001'
    ) INTO v_fiche_id;
    
    RAISE NOTICE 'Fiche d''exemple créée avec l''ID: %', v_fiche_id;
  END IF;
END $$;

-- ============================================================================
-- COMMENTAIRES ET DOCUMENTATION
-- ============================================================================

-- Commentaires sur les tables
COMMENT ON TABLE users IS 'Table des utilisateurs du système FGM avec informations complètes';
COMMENT ON TABLE fiches_tec IS 'Table des fiches de sortie/entrée de matériel avec champs étendus';
COMMENT ON TABLE signatures_tec IS 'Table des signatures électroniques avec workflow';

-- Commentaires sur les colonnes importantes
COMMENT ON COLUMN users.role IS 'Rôle de l''utilisateur dans le workflow de signatures';
COMMENT ON COLUMN users.position IS 'Poste occupé par l''utilisateur';
COMMENT ON COLUMN users.department IS 'Département d''appartenance';
COMMENT ON COLUMN users.phone_number IS 'Numéro de téléphone de contact';

COMMENT ON COLUMN fiches_tec.status IS 'Statut de la fiche selon le workflow de signatures';
COMMENT ON COLUMN fiches_tec.raisons IS 'Raison de la fiche (Entrée/Sortie/Transfert/etc.)';
COMMENT ON COLUMN fiches_tec.destinataire IS 'Destinataire ou provenance des matériels';
COMMENT ON COLUMN fiches_tec.etat IS 'État des matériels (neuf/bon/défaillant/etc.)';
COMMENT ON COLUMN fiches_tec.numero_series IS 'Numéros de série des matériels';

COMMENT ON COLUMN signatures_tec.is_obligatory IS 'Indique si la signature est obligatoire pour valider la fiche';
COMMENT ON COLUMN signatures_tec.signature_data IS 'Données de signature en base64 (canvas ou image importée)';

-- ============================================================================
-- OPTIMISATION ET FINALISATION
-- ============================================================================

-- Analyser les tables pour optimiser les performances
ANALYZE users;
ANALYZE fiches_tec;
ANALYZE signatures_tec;

-- ============================================================================
-- REQUÊTES D'EXEMPLE ET TESTS
-- ============================================================================

-- Vérifier les utilisateurs créés
SELECT 
  username, 
  full_name, 
  role, 
  position, 
  department 
FROM users 
ORDER BY role, username;

-- Vérifier les options de raisons disponibles
SELECT DISTINCT raisons FROM fiches_tec 
UNION 
SELECT unnest(ARRAY[
  'Entrée de matériels',
  'Sortie de matériels', 
  'Transfert de matériels',
  'Maintenance de matériels',
  'Retour de matériels',
  'Réparation de matériels',
  'Inventaire de matériels'
]) as raisons
ORDER BY raisons;

-- Vérifier les options d'état disponibles
SELECT unnest(ARRAY[
  'neuf',
  'bon',
  'moyen', 
  'usagé',
  'défaillant',
  'à réparer',
  'hors service',
  'en maintenance'
]) as etat
ORDER BY etat;

-- ============================================================================
-- MESSAGE DE CONFIRMATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Base de données FGM créée avec succès !';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Tables créées : users, fiches_tec, signatures_tec';
  RAISE NOTICE 'Fonctions créées : create_fiche_with_signatures, validate_signature_workflow, get_fiche_stats, get_next_required_signer';
  RAISE NOTICE 'Vues créées : fiche_statistics, signature_workflow, fiches_complete';
  RAISE NOTICE 'Triggers créés : update_updated_at, signature_status_trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'UTILISATEURS DE TEST DISPONIBLES (mot de passe: password123):';
  RAISE NOTICE '- admin (Directeur Général)';
  RAISE NOTICE '- demandeur1 (Demandeur)';
  RAISE NOTICE '- magasinier1 (Magasinier)';
  RAISE NOTICE '- controleur1 (Contrôle Qualité)';
  RAISE NOTICE '- gestionnaire1 (Contrôle Gestion)';
  RAISE NOTICE '- superieur1 (Supérieur Hiérarchique)';
  RAISE NOTICE '';
  RAISE NOTICE 'LISTES DÉROULANTES CONFIGURÉES:';
  RAISE NOTICE '- Raisons: 7 options (Entrée, Sortie, Transfert, etc.)';
  RAISE NOTICE '- États: 8 options (neuf, bon, moyen, défaillant, etc.)';
  RAISE NOTICE '';
  RAISE NOTICE 'Vous pouvez maintenant vous connecter avec admin / password123';
  RAISE NOTICE '=================================================================';
END $$;




-----------------

--Voici le code SQL complet pour supprimer toutes les contraintes CHECK prédéfinies sur les colonnes raisons et etat de la table fiches_tec :

sql
-- 1. Suppression des contraintes CHECK existantes
ALTER TABLE fiches_tec DROP CONSTRAINT IF EXISTS fiches_tec_raisons_check;
ALTER TABLE fiches_tec DROP CONSTRAINT IF EXISTS fiches_tec_etat_check;

-- 2. Modification des colonnes pour les rendre libres
ALTER TABLE fiches_tec 
ALTER COLUMN raisons TYPE TEXT,
ALTER COLUMN raisons DROP DEFAULT;

ALTER TABLE fiches_tec 
ALTER COLUMN etat TYPE TEXT,
ALTER COLUMN etat DROP DEFAULT;

-- 3. Mise à jour de la définition de la table (pour référence future)
COMMENT ON COLUMN fiches_tec.raisons IS 'Raison libre de la fiche (anciennement limitée à des valeurs prédéfinies)';
COMMENT ON COLUMN fiches_tec.etat IS 'État libre des matériels (anciennement limité à des valeurs prédéfinies)';

-- 4. Nettoyage des anciennes valeurs (optionnel)
-- Cette étape est facultative mais permet de standardiser les anciennes entrées
UPDATE fiches_tec SET 
  raisons = TRIM(raisons),
  etat = TRIM(etat)
WHERE raisons IS NOT NULL OR etat IS NOT NULL;
Version alternative si vous voulez recréer complètement la table sans contraintes :
sql
-- 1. Sauvegarde des données existantes (optionnel)
CREATE TABLE fiches_tec_backup AS SELECT * FROM fiches_tec;

-- 2. Suppression de la table originale
DROP TABLE IF EXISTS fiches_tec CASCADE;

-- 3. Recréation de la table sans contraintes CHECK
CREATE TABLE fiches_tec (
  id SERIAL PRIMARY KEY,
  demandeur_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  client VARCHAR(255) NOT NULL,
  departement VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Brouillon' CHECK (status IN (
    'Brouillon', 
    'En_Attente', 
    'Signe', 
    'Valide'
  )),
  is_internal BOOLEAN DEFAULT FALSE,
  raisons TEXT, -- Plus de contrainte CHECK
  destinataire VARCHAR(255),
  etat TEXT,    -- Plus de contrainte CHECK
  numero_series VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Recréation des triggers et index
CREATE TRIGGER update_fiches_tec_updated_at 
    BEFORE UPDATE ON fiches_tec 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_fiches_tec_demandeur ON fiches_tec(demandeur_id);
CREATE INDEX idx_fiches_tec_status ON fiches_tec(status);
CREATE INDEX idx_fiches_tec_created_at ON fiches_tec(created_at);
CREATE INDEX idx_fiches_tec_date_creation ON fiches_tec(date_creation);

-- 5. Réinsertion des données (optionnel)
INSERT INTO fiches_tec 
SELECT * FROM fiches_tec_backup;

-- 6. Nettoyage (optionnel)
DROP TABLE IF EXISTS fiches_tec_backup;
Pour vérifier que les modifications ont bien été appliquées :
sql
-- Vérification des contraintes
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  ccu.column_name
FROM 
  information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE 
  tc.table_name = 'fiches_tec';

-- Vérification des colonnes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM 
  information_schema.columns
WHERE 
  table_name = 'fiches_tec'
  AND column_name IN ('raisons', 'etat');

  ---

  --Étapes :
--Supprimer l’ancienne contrainte CHECK sur la colonne role.

--Ajouter une nouvelle contrainte CHECK incluant le rôle "admin".

--Voici les requêtes SQL :

-- Étape 1 : Supprimer l’ancienne contrainte CHECK sur "role"
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

-- Étape 2 : Ajouter la nouvelle contrainte incluant "admin"
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'demandeur',
    'directeur_general',
    'superieur_hierarchique',
    'Controle_Qualite',
    'Controle_Gestion',
    'Magasinier',
    'admin'
  )
);