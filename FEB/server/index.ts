import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Database connection avec vos paramètres
const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Vipnet_fiche",
  password: process.env.DB_PASSWORD || "7284",
  port: parseInt(process.env.DB_PORT || "5432"),
});

// Test database connection avec logs détaillés
const testConnection = async () => {
  try {
    console.log("🔄 Test de connexion à la base de données...");
    console.log(
      `📍 Host: ${process.env.DB_HOST || "localhost"}:${
        process.env.DB_PORT || "5432"
      }`
    );
    console.log(`🗄️  Database: ${process.env.DB_NAME || "Vipnet_fiche"}`);
    console.log(`👤 User: ${process.env.DB_USER || "postgres"}`);

    const client = await pool.connect();
    console.log("✅ Connexion à la base de données réussie");

    // Test des tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'fiches_tec', 'signatures_tec')
    `);

    console.log(
      `📊 Tables trouvées: ${tablesResult.rows
        .map((r) => r.table_name)
        .join(", ")}`
    );

    // Test des utilisateurs
    const usersResult = await client.query(
      "SELECT username, role FROM users ORDER BY username"
    );
    console.log(`👥 Utilisateurs disponibles: ${usersResult.rows.length}`);
    usersResult.rows.forEach((user) => {
      console.log(`   - ${user.username} (${user.role})`);
    });

    client.release();
  } catch (err) {
    console.error("❌ Erreur de connexion à la base de données:");
    console.error(`   Message: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    console.error("");
    console.error("🔧 Vérifications à faire:");
    console.error("   1. PostgreSQL est-il démarré ?");
    console.error('   2. La base "Vipnet_fiche" existe-t-elle ?');
    console.error(
      '   3. L\'utilisateur "postgres" a-t-il le bon mot de passe ?'
    );
    console.error("   4. Le script SQL a-t-il été exécuté ?");
  }
};

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost",
      "http://localhost:5174",
      "http://197.159.195.207",
      "http://197.159.195.207:5174",
      "http://197.159.195.207:5001"  // Pour les requêtes directes
    ],
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(express.json());

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "vipnet-feb-secret-key"
    ) as any;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      decoded.userId,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non trouvé" });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error("Erreur de vérification du token:", error);
    return res.status(401).json({ success: false, message: "Token invalide" });
  }
};

// Routes

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      position,
      department,
      phoneNumber,
      role,
    } = req.body;

    console.log("📝 Tentative d'inscription:", { username, email, role });

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur ou email déjà utilisé",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      "INSERT INTO users (username, email, password, full_name, position, department, phone_number, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email, full_name, position, department, phone_number, role, created_at",
      [
        username,
        email,
        hashedPassword,
        fullName,
        position,
        department,
        phoneNumber,
        role,
      ]
    );

    const user = result.rows[0];

    console.log("✅ Utilisateur créé avec succès:", user.username);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        position: user.position,
        department: user.department,
        phoneNumber: user.phone_number,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'inscription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'inscription",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("🔐 Tentative de connexion pour:", username);

    // Find user
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      console.log("❌ Utilisateur non trouvé:", username);
      return res.status(401).json({
        success: false,
        message: "Nom d'utilisateur ou mot de passe incorrect",
      });
    }

    const user = result.rows[0];
    console.log("👤 Utilisateur trouvé:", user.username, "Role:", user.role);

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log("❌ Mot de passe incorrect pour:", username);
      return res.status(401).json({
        success: false,
        message: "Nom d'utilisateur ou mot de passe incorrect",
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "vipnet-feb-secret-key",
      { expiresIn: "24h" }
    );

    console.log("✅ Connexion réussie pour:", username);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          position: user.position,
          department: user.department,
          phoneNumber: user.phone_number,
          role: user.role,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la connexion:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la connexion",
    });
  }
});

// Test route pour vérifier les utilisateurs
app.get("/api/auth/test-users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, full_name, role, email FROM users ORDER BY username"
    );
    res.json({
      success: true,
      data: result.rows,
      message: `${result.rows.length} utilisateur(s) trouvé(s)`,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des utilisateurs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des utilisateurs",
    });
  }
});

// Fiches routes
app.get("/api/fiches", authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.*,
        u.username as demandeur_username,
        u.full_name as demandeur_full_name,
        u.email as demandeur_email,
        u.position as demandeur_position,
        u.department as demandeur_department,
        u.phone_number as demandeur_phone,
        u.role as demandeur_role
      FROM fiches_tec f
      JOIN users u ON f.demandeur_id = u.id
      ORDER BY f.created_at DESC
    `);

    const fiches = await Promise.all(
      result.rows.map(async (fiche) => {
        const signaturesResult = await pool.query(
          `
        SELECT 
          s.*,
          u.username,
          u.full_name,
          u.email,
          u.position,
          u.department,
          u.phone_number,
          u.role as user_role
        FROM signatures_tec s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.fiche_id = $1
        ORDER BY s.created_at
      `,
          [fiche.id]
        );

        return {
          id: fiche.id,
          demandeurId: fiche.demandeur_id,
          demandeur: {
            id: fiche.demandeur_id,
            username: fiche.demandeur_username,
            fullName: fiche.demandeur_full_name,
            email: fiche.demandeur_email,
            position: fiche.demandeur_position,
            department: fiche.demandeur_department,
            phoneNumber: fiche.demandeur_phone,
            role: fiche.demandeur_role,
          },
          dateCreation: fiche.date_creation,
          client: fiche.client,
          departement: fiche.departement,
          description: fiche.description,
          status: fiche.status,
          isInternal: fiche.is_internal,
          raisons: fiche.raisons,
          destinataire: fiche.destinataire,
          etat: fiche.etat,
          numeroSeries: fiche.numero_series,
          signatures: signaturesResult.rows.map((sig: any) => ({
            id: sig.id,
            ficheId: sig.fiche_id,
            userId: sig.user_id,
            user: sig.user_id
              ? {
                  id: sig.user_id,
                  username: sig.username,
                  fullName: sig.full_name,
                  email: sig.email,
                  position: sig.position,
                  department: sig.department,
                  phoneNumber: sig.phone_number,
                  role: sig.user_role,
                }
              : null,
            role: sig.role,
            signatureData: sig.signature_data,
            isObligatory: sig.is_obligatory,
            signedAt: sig.signed_at,
            createdAt: sig.created_at,
          })),
          createdAt: fiche.created_at,
          updatedAt: fiche.updated_at,
        };
      })
    );

    res.json({
      success: true,
      data: fiches,
    });
  } catch (error) {
    console.error("❌ Error fetching fiches:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des fiches",
    });
  }
});

app.get("/api/fiches/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        f.*,
        u.username as demandeur_username,
        u.full_name as demandeur_full_name,
        u.email as demandeur_email,
        u.position as demandeur_position,
        u.department as demandeur_department,
        u.phone_number as demandeur_phone,
        u.role as demandeur_role
      FROM fiches_tec f
      JOIN users u ON f.demandeur_id = u.id
      WHERE f.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fiche non trouvée",
      });
    }

    const fiche = result.rows[0];

    const signaturesResult = await pool.query(
      `
      SELECT 
        s.*,
        u.username,
        u.full_name,
        u.email,
        u.position,
        u.department,
        u.phone_number,
        u.role as user_role
      FROM signatures_tec s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.fiche_id = $1
      ORDER BY s.created_at
    `,
      [id]
    );

    const ficheData = {
      id: fiche.id,
      demandeurId: fiche.demandeur_id,
      demandeur: {
        id: fiche.demandeur_id,
        username: fiche.demandeur_username,
        fullName: fiche.demandeur_full_name,
        email: fiche.demandeur_email,
        position: fiche.demandeur_position,
        department: fiche.demandeur_department,
        phoneNumber: fiche.demandeur_phone,
        role: fiche.demandeur_role,
      },
      dateCreation: fiche.date_creation,
      client: fiche.client,
      departement: fiche.departement,
      description: fiche.description,
      status: fiche.status,
      isInternal: fiche.is_internal,
      raisons: fiche.raisons,
      destinataire: fiche.destinataire,
      etat: fiche.etat,
      numeroSeries: fiche.numero_series,
      signatures: signaturesResult.rows.map((sig: any) => ({
        id: sig.id,
        ficheId: sig.fiche_id,
        userId: sig.user_id,
        user: sig.user_id
          ? {
              id: sig.user_id,
              username: sig.username,
              fullName: sig.full_name,
              email: sig.email,
              position: sig.position,
              department: sig.department,
              phoneNumber: sig.phone_number,
              role: sig.user_role,
            }
          : null,
        role: sig.role,
        signatureData: sig.signature_data,
        isObligatory: sig.is_obligatory,
        signedAt: sig.signed_at,
        createdAt: sig.created_at,
      })),
      createdAt: fiche.created_at,
      updatedAt: fiche.updated_at,
    };

    res.json({
      success: true,
      data: ficheData,
    });
  } catch (error) {
    console.error("❌ Error fetching fiche:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la fiche",
    });
  }
});

app.post("/api/fiches", authenticateToken, async (req: any, res) => {
  try {
    const {
      client,
      departement,
      description,
      isInternal,
      raisons,
      destinataire,
    } = req.body;
    const userId = req.user.id;

    console.log("📝 Création de fiche par:", req.user.username);

    // Create fiche
    const result = await pool.query(
      "INSERT INTO fiches_tec (demandeur_id, client, departement, description, is_internal, raisons, destinataire) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        userId,
        client,
        departement,
        description,
        isInternal || false,
        raisons,
        destinataire,
      ]
    );

    const fiche = result.rows[0];

    // Create signature records for all required roles
    const signatureRoles = [
      { role: "demandeur", isObligatory: true },
      { role: "superieur_hierarchique", isObligatory: false },
      { role: "Controle_Qualite", isObligatory: false },
      { role: "Controle_Gestion", isObligatory: false },
      { role: "Magasinier", isObligatory: false },
      { role: "directeur_general", isObligatory: true },
    ];

    for (const sigRole of signatureRoles) {
      await pool.query(
        "INSERT INTO signatures_tec (fiche_id, role, is_obligatory) VALUES ($1, $2, $3)",
        [fiche.id, sigRole.role, sigRole.isObligatory]
      );
    }

    // Get user info
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const user = userResult.rows[0];

    console.log("✅ Fiche créée avec succès, ID:", fiche.id);

    res.status(201).json({
      success: true,
      data: {
        id: fiche.id,
        demandeurId: fiche.demandeur_id,
        demandeur: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          position: user.position,
          department: user.department,
          phoneNumber: user.phone_number,
          role: user.role,
        },
        dateCreation: fiche.date_creation,
        client: fiche.client,
        departement: fiche.departement,
        description: fiche.description,
        status: fiche.status,
        isInternal: fiche.is_internal,
        raisons: fiche.raisons,
        destinataire: fiche.destinataire,
        etat: fiche.etat,
        numeroSeries: fiche.numero_series,
        signatures: [],
        createdAt: fiche.created_at,
        updatedAt: fiche.updated_at,
      },
    });
  } catch (error) {
    console.error("❌ Error creating fiche:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la fiche",
    });
  }
});

app.post("/api/fiches/:id/sign", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { role, signatureData } = req.body;
    const userId = req.user.id;

    console.log("✍️ Tentative de signature:", {
      ficheId: id,
      role,
      userId,
      userRole: req.user.role,
    });

    // Check if user has the right role
    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation pour signer avec ce rôle",
      });
    }

    // Check if signature record exists and is not already signed
    const signatureResult = await pool.query(
      "SELECT * FROM signatures_tec WHERE fiche_id = $1 AND role = $2",
      [id, role]
    );

    if (signatureResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Signature non trouvée",
      });
    }

    const signature = signatureResult.rows[0];

    if (signature.signed_at) {
      return res.status(400).json({
        success: false,
        message: "Cette fiche a déjà été signée pour ce rôle",
      });
    }

    // For directeur_general signature, check if demandeur has signed first
    if (role === "directeur_general") {
      const demandeurSignature = await pool.query(
        "SELECT * FROM signatures_tec WHERE fiche_id = $1 AND role = $2 AND signed_at IS NOT NULL",
        [id, "demandeur"]
      );

      if (demandeurSignature.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Le demandeur doit signer en premier",
        });
      }
    }

    // Update signature
    await pool.query(
      "UPDATE signatures_tec SET user_id = $1, signature_data = $2, signed_at = CURRENT_TIMESTAMP WHERE id = $3",
      [userId, signatureData, signature.id]
    );

    // Update fiche status based on signatures
    const allSignatures = await pool.query(
      "SELECT * FROM signatures_tec WHERE fiche_id = $1",
      [id]
    );

    const obligatorySignatures = allSignatures.rows.filter(
      (s) => s.is_obligatory
    );
    const signedObligatory = obligatorySignatures.filter((s) => s.signed_at);

    let newStatus = "Brouillon";
    if (signedObligatory.length === 1) {
      newStatus = "En_Attente";
    } else if (signedObligatory.length === obligatorySignatures.length) {
      newStatus = "Valide";
    }

    await pool.query(
      "UPDATE fiches_tec SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newStatus, id]
    );

    console.log("✅ Signature enregistrée avec succès");

    res.json({
      success: true,
      message: "Signature enregistrée avec succès",
    });
  } catch (error) {
    console.error("❌ Error signing fiche:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la signature",
    });
  }
});

app.delete("/api/fiches/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Vérifier si la fiche existe
    const ficheResult = await pool.query(
      "SELECT * FROM fiches_tec WHERE id = $1",
      [id]
    );

    if (ficheResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fiche non trouvée",
      });
    }

    const fiche = ficheResult.rows[0];

    // Autoriser admin OU le demandeur (pour les brouillons)
    if (userRole !== "admin") {
      if (fiche.demandeur_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à supprimer cette fiche",
        });
      }

      if (fiche.status !== "Brouillon") {
        return res.status(400).json({
          success: false,
          message: "Impossible de supprimer une fiche signée",
        });
      }
    }

    // Supprimer d'abord les signatures (contrainte de clé étrangère)
    await pool.query("DELETE FROM signatures_tec WHERE fiche_id = $1", [id]);

    // Supprimer la fiche
    await pool.query("DELETE FROM fiches_tec WHERE id = $1", [id]);

    console.log("🗑️ Fiche supprimée avec succès, ID:", id);

    res.json({
      success: true,
      message: "Fiche supprimée avec succès",
    });
  } catch (error) {
    console.error("❌ Error deleting fiche:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression",
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    config: {
      port: PORT,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
    },
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(
    "================================================================="
  );
  console.log("🚀 SERVEUR FGM VIPNET DÉMARRÉ");
  console.log(
    "================================================================="
  );
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(
    `🔍 Test utilisateurs: http://localhost:${PORT}/api/auth/test-users`
  );
  console.log(
    `💻 Frontend: ${process.env.VITE_API_BASE_URL || "http://localhost:3000"}`
  );
  console.log(
    "================================================================="
  );

  await testConnection();

  console.log(
    "================================================================="
  );
  console.log("✅ SERVEUR PRÊT - Vous pouvez vous connecter !");
  console.log("");
  console.log("👤 COMPTES DE TEST (mot de passe: password123):");
  console.log("   - admin (Directeur Général)");
  console.log("   - demandeur1 (Demandeur)");
  console.log("   - magasinier1 (Magasinier)");
  console.log("   - controleur1 (Contrôle Qualité)");
  console.log("   - gestionnaire1 (Contrôle Gestion)");
  console.log("   - superieur1 (Supérieur Hiérarchique)");
  console.log(
    "================================================================="
  );
});
