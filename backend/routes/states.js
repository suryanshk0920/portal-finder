import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
  const statesPath = path.join(__dirname, "../data/states.json");

  try {
    const data = fs.readFileSync(statesPath, "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("[ERROR] Failed to load states.json:", err);
    res.status(500).json({ error: "Could not load states data" });
  }
});

export default router;
