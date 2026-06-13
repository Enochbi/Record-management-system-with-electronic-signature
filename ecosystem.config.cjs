const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

module.exports = {
  apps: [
    // =============================================
    // FDP Application (Main Project)
    // =============================================
    
    // Backend FDP
    {
      name: "backend-fdp",
      script: "./server/index.js",
      cwd: __dirname,
      env: {
        PORT: 5000,
        HOST: "192.168.2.213",
        NODE_ENV: "production",
        DB_HOST: process.env.DB_HOST || "localhost",
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || "Vipnet_fiche",
        DB_USER: process.env.DB_USER || "postgres",
        DB_PASSWORD: process.env.DB_PASSWORD || "7284",
        JWT_SECRET: process.env.JWT_SECRET || require("crypto").randomBytes(64).toString("hex"),
      },
      error_file: path.join(logsDir, "backend-fdp-err.log"),
      out_file: path.join(logsDir, "backend-fdp-out.log"),
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      instances: 1,
      exec_mode: "fork"
    },

    // Frontend FDP
    {
      name: "frontend-fdp",
      script: "cmd.exe",
      args: "/c npm run dev -- --host 0.0.0.0 --port 5173 --strictPort",
      cwd: __dirname,
      env: {
        NODE_ENV: "development",
        VITE_API_BASE_URL: "http://197.159.195.207:5000",
        BROWSER: "none",
        FORCE_COLOR: "1"
      },
      error_file: path.join(logsDir, "frontend-fdp-err.log"),
      out_file: path.join(logsDir, "frontend-fdp-out.log"),
      time: true,
      autorestart: true,
      watch: false,
      interpreter: "none"
    },

    // =============================================
    // FEB Application (Sub Project)
    // =============================================
    
    // Backend FEB - TypeScript avec tsx
    {
      name: "backend-feb",
      script: "npm",
      args: "run dev:server",
      cwd: path.join(__dirname, "FEB"),
      env: {
        PORT: 5001,
        HOST: "192.168.2.213",
        NODE_ENV: "production",
        DB_HOST: process.env.DB_HOST || "localhost",
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || "Vipnet_fiche",
        DB_USER: process.env.DB_USER || "postgres",
        DB_PASSWORD: process.env.DB_PASSWORD || "7284",
        JWT_SECRET: process.env.JWT_SECRET_FEB || require("crypto").randomBytes(64).toString("hex"),
      },
      error_file: path.join(logsDir, "backend-feb-err.log"),
      out_file: path.join(logsDir, "backend-feb-out.log"),
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      instances: 1,
      exec_mode: "fork"
    },

    // Frontend FEB
    {
      name: "frontend-feb",
      script: "cmd.exe",
      args: "/c npm run dev:client -- --host 0.0.0.0 --port 5174 --strictPort",
      cwd: path.join(__dirname, "FEB"),
      env: {
        NODE_ENV: "development",
        VITE_API_BASE_URL: "http://197.159.195.207:5001",
        BROWSER: "none",
        FORCE_COLOR: "1"
      },
      error_file: path.join(logsDir, "frontend-feb-err.log"),
      out_file: path.join(logsDir, "frontend-feb-out.log"),
      time: true,
      autorestart: true,
      watch: false,
      interpreter: "none"
    }
  ]
};