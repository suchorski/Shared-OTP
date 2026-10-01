import { Router } from "express";
import { parsePage } from "../lib/http.js";
import { listAudit } from "../lib/audit.js";

const router = Router();

router.get("/me", async (req, res) => {
  res.json(await listAudit({ actorId: req.user.id }, parsePage(req.query)));
});

export default router;
