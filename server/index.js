import pkg from "pg";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const { Pool } = pkg;

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "7284",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "Vipnet_fiche",
});

app.use(
  cors({
    origin: [
      "http://localhost",
      "http://localhost:5173",
      "http://197.159.195.207",
      "http://197.159.195.207:5173",
    ],
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "vipnet-fdp-secret-key",
    (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Token invalide" });
      }
      req.user = user;
      next();
    }
  );
};

// ─── USER ROUTES ────────────────────────────────────────────────────────────

app.get("/api/users", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès réservé aux administrateurs" });
  }
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, full_name FROM users ORDER BY username"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur récupération utilisateurs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/api/users/:id/reset-password", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès réservé aux administrateurs" });
  }
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ message: "Le nouveau mot de passe est requis" });
  }
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2 RETURNING id, username, email",
      [hashedPassword, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ success: true, message: "Mot de passe modifié avec succès" });
  } catch (err) {
    console.error("Erreur modification mot de passe:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/api/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès non autorisé" });
  }
  const { id } = req.params;
  const { role } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role",
      [role, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur mise à jour utilisateur:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

app.post("/api/register", async (req, res) => {
  const { username, password, email, full_name, role, position, department, phone_number } = req.body;

  const requiredFields = ["username", "password", "email", "full_name", "role", "position", "department"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: "Champs obligatoires manquants", missingFields });
  }

  try {
    const userCheck = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (userCheck.rows.length > 0) {
      return res.status(409).json({
        error: "Utilisateur existe déjà",
        conflict: {
          username: userCheck.rows[0].username === username,
          email: userCheck.rows[0].email === email,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      `INSERT INTO users (username, password, email, full_name, role, position, department, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, email, role, position, department`,
      [username, hashedPassword, email, full_name, role, position, department, phone_number || null]
    );

    res.status(201).json({ success: true, user: newUser.rows[0], message: "Compte créé avec succès" });
  } catch (error) {
    console.error("Erreur inscription:", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET || "vipnet-fdp-secret-key",
      { expiresIn: "24h" }
    );

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      position: user.position,
      department: user.department,
      phoneNumber: user.phone_number,
      token,
    });
  } catch (err) {
    console.error("Erreur lors de la connexion:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─── FDP ROUTES ─────────────────────────────────────────────────────────────

app.post("/api/fdp", authenticateToken, async (req, res) => {
  const {
    creation_date,
    description,
    amount,
    payment_method,
    payment_reference,
    department_source,
    department_destination,
    requester_signature,
    requester_signature_date,
    type_description,
  } = req.body;

  try {
    const creationDateObj = new Date(creation_date);
    if (isNaN(creationDateObj.getTime())) {
      return res.status(400).json({ message: "Date de création invalide" });
    }

    const tempReference = `TEMP-${creationDateObj.toLocaleDateString("fr-FR")}-F`;
    const createResult = await pool.query(
      `INSERT INTO fdps (
        reference, creation_date, requester_id, description, amount,
        payment_method, payment_reference, department_source, department_destination,
        status, requester_signature, requester_signature_date, type_description
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        tempReference,
        creationDateObj,
        req.user.id,
        description,
        amount,
        payment_method,
        payment_reference,
        department_source,
        department_destination,
        "pending_superieur_hierarchique",
        requester_signature,
        requester_signature_date,
        type_description,
      ]
    );

    const newId = createResult.rows[0].id;
    const finalReference = `${newId} - ${creationDateObj.toLocaleDateString("fr-FR")} - F`;
    await pool.query("UPDATE fdps SET reference = $1 WHERE id = $2", [finalReference, newId]);

    const finalResult = await pool.query("SELECT * FROM fdps WHERE id = $1", [newId]);
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);

    const fdp = finalResult.rows[0];
    fdp.requesterName = userResult.rows[0].full_name;
    fdp.requesterPosition = userResult.rows[0].position;
    fdp.requesterDepartment = userResult.rows[0].department;
    fdp.requesterPhone = userResult.rows[0].phone_number;
    fdp.requesterEmail = userResult.rows[0].email;

    res.json(fdp);
  } catch (err) {
    console.error("Erreur lors de la création de la FDP:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/fdp/mine", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*,
        u.full_name as requester_name,
        u.position as requester_position,
        u.department as requester_department,
        u.phone_number as requester_phone,
        u.email as requester_email
      FROM fdps f
      LEFT JOIN users u ON f.requester_id = u.id
      WHERE f.requester_id = $1
      ORDER BY f.creation_date DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur lors de la récupération des FDPs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/fdp/pending/:role", authenticateToken, async (req, res) => {
  const { role } = req.params;

  // Mapping rôle → champ de signature (pour filtrer les fiches sans signature de ce rôle)
  const roleSignatureMap = {
    demandeur: "requester_signature",
    superieur_hierarchique: "superieur_hierarchique_signature",
    comptabilite: "comptabilite_signature",
    directeur_general: "directeur_general_signature",
    caisse: "caisse_signature",
  };

  try {
    let query = `
      SELECT f.*,
        u.full_name as requester_name,
        u.position as requester_position,
        u.department as requester_department,
        u.phone_number as requester_phone,
        u.email as requester_email
      FROM fdps f
      LEFT JOIN users u ON f.requester_id = u.id
      WHERE f.status != 'rejected'
    `;

    const sigField = roleSignatureMap[role];
    if (sigField) {
      query += ` AND f.${sigField} IS NULL`;
    }

    query += ` ORDER BY f.creation_date DESC`;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur lors de la récupération des FDPs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/fdp", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*,
        u.full_name as requester_name,
        u.position as requester_position,
        u.department as requester_department,
        u.phone_number as requester_phone,
        u.email as requester_email,
        CASE
          WHEN f.reference LIKE 'TEMP-%' THEN 'En attente de finalisation'
          ELSE f.reference
        END as formatted_reference
      FROM fdps f
      LEFT JOIN users u ON f.requester_id = u.id
      ORDER BY f.creation_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur lors de la récupération des FDPs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/api/fdp/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*,
        u.full_name as requester_name,
        u.position as requester_position,
        u.department as requester_department,
        u.phone_number as requester_phone,
        u.email as requester_email,
        CASE
          WHEN f.reference LIKE 'TEMP-%' THEN 'En attente de finalisation'
          ELSE f.reference
        END as formatted_reference
      FROM fdps f
      LEFT JOIN users u ON f.requester_id = u.id
      WHERE f.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "FDP non trouvée" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur lors de la récupération de la FDP:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/api/fdp/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fdp = await pool.query("SELECT * FROM fdps WHERE id = $1", [id]);
    if (fdp.rows.length === 0) {
      return res.status(404).json({ message: "FDP non trouvée" });
    }

    // Blocage de modification si le DG a signé (sauf admin)
    if (fdp.rows[0].directeur_general_signature && req.user.role !== "admin") {
      return res.status(403).json({ message: "Modification impossible : le Directeur Général a déjà signé" });
    }

    if (fdp.rows[0].requester_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const result = await pool.query(
      `UPDATE fdps SET
        description = COALESCE($1, description),
        amount = COALESCE($2, amount),
        payment_method = COALESCE($3, payment_method),
        payment_reference = COALESCE($4, payment_reference),
        department_source = COALESCE($5, department_source),
        department_destination = COALESCE($6, department_destination),
        status = COALESCE($7, status),
        type_description = COALESCE($8, type_description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 RETURNING *`,
      [
        updates.description,
        updates.amount,
        updates.payment_method,
        updates.payment_reference,
        updates.department_source,
        updates.department_destination,
        updates.status,
        updates.type_description,
        id,
      ]
    );

    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [result.rows[0].requester_id]);
    const updatedFdp = result.rows[0];
    updatedFdp.requesterName = userResult.rows[0].full_name;
    updatedFdp.requesterPosition = userResult.rows[0].position;
    updatedFdp.requesterDepartment = userResult.rows[0].department;
    updatedFdp.requesterPhone = userResult.rows[0].phone_number;
    updatedFdp.requesterEmail = userResult.rows[0].email;

    res.json(updatedFdp);
  } catch (err) {
    console.error("Erreur lors de la mise à jour de la FDP:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.delete("/api/fdp/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const fdp = await pool.query("SELECT * FROM fdps WHERE id = $1", [id]);
    if (fdp.rows.length === 0) {
      return res.status(404).json({ message: "FDP non trouvée" });
    }
    if (req.user.role === "admin") {
      await pool.query("DELETE FROM fdps WHERE id = $1", [id]);
      return res.json({ message: "FDP supprimée avec succès" });
    }
    if (fdp.rows[0].requester_id !== req.user.id) {
      return res.status(403).json({ message: "Non autorisé" });
    }
    await pool.query("DELETE FROM fdps WHERE id = $1", [id]);
    res.json({ message: "FDP supprimée avec succès" });
  } catch (err) {
    console.error("Erreur lors de la suppression de la FDP:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─── SIGN ROUTE ──────────────────────────────────────────────────────────────
// Règles :
//  1. Pas de blocage par statut → on vérifie juste si le champ de signature est vide
//  2. On ne peut pas re-signer un champ déjà signé
//  3. Le DG signe son propre champ ou le champ supérieur_hierarchique
//  4. La Caisse peut signer en tant que Caisse, Demandeur ou Supérieur hiérarchique
//  5. Opérations et Trésorerie sont retirés du workflow visible

app.post("/api/fdp/:id/sign", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { signature, approved, rejectionReason, validatedAmount, selectedRole } = req.body;

  // Le rôle utilisé pour signer (peut être un rôle alternatif sélectionné)
  const signingRole = selectedRole || req.user.role;

  try {
    const fdpResult = await pool.query("SELECT * FROM fdps WHERE id = $1", [id]);
    if (fdpResult.rows.length === 0) {
      return res.status(404).json({ message: "FDP non trouvée" });
    }
    const fdp = fdpResult.rows[0];

    // ── Rejet ──────────────────────────────────────────────────────────────
    if (!approved) {
      if (!rejectionReason) {
        return res.status(400).json({ message: "La raison du rejet est requise" });
      }
      const result = await pool.query(
        `UPDATE fdps SET
          status = 'rejected',
          rejection_reason = $1,
          rejected_by = $2,
          rejection_date = CURRENT_TIMESTAMP
        WHERE id = $3 RETURNING *`,
        [rejectionReason, req.user.fullName || req.user.username, id]
      );
      return res.json(result.rows[0]);
    }

    // ── Mapping rôle → champ de signature ─────────────────────────────────
    const signatureFieldMap = {
      demandeur:                  { sig: "requester_signature",                  date: "requester_signature_date" },
      superieur_hierarchique:     { sig: "superieur_hierarchique_signature",     date: "superieur_hierarchique_signature_date" },
      comptabilite:               { sig: "comptabilite_signature",               date: "comptabilite_signature_date" },
      directeur_general:          { sig: "directeur_general_signature",          date: "directeur_general_signature_date" },
      caisse:                     { sig: "caisse_signature",                     date: "caisse_signature_date" },
    };

    const fieldInfo = signatureFieldMap[signingRole];
    if (!fieldInfo) {
      return res.status(400).json({ message: `Rôle de signature non reconnu : ${signingRole}` });
    }

    // ── Vérifier que la signature n'est pas déjà présente ─────────────────
    if (fdp[fieldInfo.sig]) {
      return res.status(400).json({ message: "Cette signature a déjà été apposée sur cette fiche" });
    }

    // ── Cas spécial : Directeur Général (montant validé requis) ───────────
    if (signingRole === "directeur_general") {
      let amountValue = null;

      if (fdp.type_description !== "Expression de besoin") {
        if (!validatedAmount) {
          return res.status(400).json({ message: "Le montant validé est obligatoire pour le DG." });
        }
        const cleaned = validatedAmount.toString().replace(/[^0-9]/g, "");
        if (!cleaned) {
          return res.status(400).json({ message: "Format de montant invalide. Exemple : 250000" });
        }
        amountValue = parseInt(cleaned, 10);
        if (isNaN(amountValue) || amountValue <= 0) {
          return res.status(400).json({ message: "Le montant doit être un entier supérieur à 0." });
        }
      } else {
        if (validatedAmount) {
          const cleaned = validatedAmount.toString().replace(/[^0-9]/g, "");
          if (cleaned) {
            amountValue = parseInt(cleaned, 10);
            if (isNaN(amountValue) || amountValue <= 0) amountValue = null;
          }
        }
      }

      const result = await pool.query(
        `UPDATE fdps SET
          directeur_general_signature = $1,
          directeur_general_signature_date = CURRENT_TIMESTAMP,
          validated_amount = $2,
          status = 'pending_caisse'
        WHERE id = $3 RETURNING *`,
        [signature, amountValue, id]
      );
      return res.json(result.rows[0]);
    }

    // ── Mise à jour du champ de signature (tous les autres rôles) ─────────
    // Déterminer le prochain statut informationnel
    const nextStatus = getNextStatus(signingRole, fdp.status);

    const result = await pool.query(
      `UPDATE fdps SET
        ${fieldInfo.sig} = $1,
        ${fieldInfo.date} = CURRENT_TIMESTAMP,
        status = CASE WHEN status = 'rejected' THEN status ELSE $2 END
      WHERE id = $3 RETURNING *`,
      [signature, nextStatus, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur lors de la signature de la FDP:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Statut informationnel (non bloquant) basé sur le rôle qui vient de signer
function getNextStatus(signingRole, currentStatus) {
  // Ne pas écraser un statut déjà plus avancé
  const statusOrder = [
    "pending_superieur_hierarchique",
    "pending_comptabilite",
    "pending_directeur_general",
    "pending_caisse",
    "completed",
  ];

  const roleStatusMap = {
    demandeur: "pending_superieur_hierarchique",
    superieur_hierarchique: "pending_comptabilite",
    comptabilite: "pending_directeur_general",
    directeur_general: "pending_caisse",
    caisse: "completed",
  };

  const newStatus = roleStatusMap[signingRole] || currentStatus;
  const currentIdx = statusOrder.indexOf(currentStatus);
  const newIdx = statusOrder.indexOf(newStatus);

  // On n'avance pas en arrière dans le workflow
  return newIdx > currentIdx ? newStatus : currentStatus;
}

// Start server
app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
  console.log(`Server FDP running on http://197.159.195.207:${process.env.PORT || 5000}`);
});