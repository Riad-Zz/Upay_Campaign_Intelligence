/**
 * server.js — Upay Campaign Intelligence API
 *
 * Startup sequence:
 *  1. Load JSON artifacts from /data into memory
 *  2. Start Express server
 *
 * All ML inference is pre-computed by Python.
 * Node only runs the campaign engine + optimization at request time.
 */

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { loadAllData } = require("./services/dataService");
const apiRouter = require("./routes/api");

const PORT = process.env.PORT || 3001;
const app  = express();

// Allow CORS from any origin in development, or from ALLOWED_ORIGIN in production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static frontend build (production)
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));

// ── Load data artifacts at startup ────────────────────────────────────────────
async function startServer() {
  try {
    console.log("[server] Loading data artifacts...");
    await loadAllData();
    console.log("[server] Data loaded. Starting server...");

    app.use("/api", apiRouter);

    // SPA fallback — serve index.html for any non-API route
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });

    app.listen(PORT, () => {
      console.log(`[server] ✅ Upay Campaign Intelligence API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[server] ❌ Failed to start:", err.message);
    process.exit(1);
  }
}

startServer();
