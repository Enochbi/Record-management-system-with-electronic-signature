-- Création de la base de données si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'Vipnet_fiche') THEN
    CREATE DATABASE "Vipnet_fiche";
  END IF;
END
$$;

-- Connexion à la base de données
\c Vipnet_fiche;

-- Création de la table users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  position VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table fdps
CREATE TABLE IF NOT EXISTS fdps (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(50) UNIQUE NOT NULL,
  creation_date DATE NOT NULL,
  requester_id INTEGER REFERENCES users(id),
  description TEXT NOT NULL,
  amount DECIMAL(15, 2),
  validated_amount DECIMAL(15, 2),
  payment_method VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(100),
  department_source VARCHAR(100) NOT NULL,
  department_destination TEXT[] NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  
  requester_signature TEXT,
  operations_signature TEXT,
  fournisseur_signature TEXT,
  chef_service_signature TEXT,
  responsable_financier_signature TEXT,
  responsable_comptable_signature TEXT,
  directeur_general_signature TEXT,
  caisse_signature TEXT,
  
  requester_signature_date TIMESTAMP WITH TIME ZONE,
  operations_signature_date TIMESTAMP WITH TIME ZONE,
  fournisseur_signature_date TIMESTAMP WITH TIME ZONE,
  chef_service_signature_date TIMESTAMP WITH TIME ZONE,
  responsable_financier_signature_date TIMESTAMP WITH TIME ZONE,
  responsable_comptable_signature_date TIMESTAMP WITH TIME ZONE,
  directeur_general_signature_date TIMESTAMP WITH TIME ZONE,
  caisse_signature_date TIMESTAMP WITH TIME ZONE,
  
  rejection_reason TEXT,
  rejected_by VARCHAR(100),
  rejection_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

----

-- 1. Renommer les colonnes existantes pour correspondre aux nouveaux noms
ALTER TABLE fdps RENAME COLUMN chef_service_signature TO superieur_hierarchique_signature;
ALTER TABLE fdps RENAME COLUMN responsable_financier_signature TO tresorerie_signature;
ALTER TABLE fdps RENAME COLUMN responsable_comptable_signature TO comptabilite_signature;

ALTER TABLE fdps RENAME COLUMN chef_service_signature_date TO superieur_hierarchique_signature_date;
ALTER TABLE fdps RENAME COLUMN responsable_financier_signature_date TO tresorerie_signature_date;
ALTER TABLE fdps RENAME COLUMN responsable_comptable_signature_date TO comptabilite_signature_date;

-- 2. Supprimer les colonnes redondantes (si elles existent)
ALTER TABLE fdps DROP COLUMN IF EXISTS requester_name;
ALTER TABLE fdps DROP COLUMN IF EXISTS requester_position;
ALTER TABLE fdps DROP COLUMN IF EXISTS requester_department;
ALTER TABLE fdps DROP COLUMN IF EXISTS requester_phone;
ALTER TABLE fdps DROP COLUMN IF EXISTS requester_email;

-- 3. Ajouter le trigger si il n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fdps_updated_at') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_fdps_updated_at
    BEFORE UPDATE ON fdps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 4. Mettre à jour les contraintes si nécessaire
ALTER TABLE fdps ALTER COLUMN requester_id SET NOT NULL;


-------
-- Création des index
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_fdps_status ON fdps(status);
CREATE INDEX IF NOT EXISTS idx_fdps_creation_date ON fdps(creation_date);


---

-- Mise à jour de toutes les références pour correspondre aux dates de création
UPDATE fdps
SET reference = 
    id || ' - ' || 
    TO_CHAR(creation_date, 'DD/MM/YYYY') || 
    ' - F';

-- Vérification des résultats
SELECT id, reference, creation_date FROM fdps;