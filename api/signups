// Vercel serverless function: /api/signup
// Instantly assigns a volunteer to an open role: writes their name into the
// FIRST open row matching the role, only if Assigned To is empty. Verifies the
// write to handle two people racing for the same slot. Logs to Signups table.
 
const BASE_ID = "appULR9ueveTBZjAI";
const ROLES_TABLE = "tblA5UXs2v0Q3GDPV";
const SIGNUPS_TABLE = "tblDrBVb3zleqYOIl";
const API = "https://api.airtable.com/v0";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false, reason: "POST only" });
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return res.status(500).json({ ok: false, reason: "AIRTABLE_TOKEN not set" });
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // parse + sanity-check input
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const role = String((body && body.role) || "").trim().slice(0, 120);
  const name = String((body && body.name) || "").trim().slice(0, 80);
  const note = String((body && body.note) || "").trim().slice(0, 300);
  if (!role || !name) return res.status(400).json({ ok: false, reason: "Missing role or name" });

  try {
    // find ALL open rows for this exact role (handles numbered duplicate slots)
    const formula = `AND({Role}="${role.replace(/"/g, "")}", {Assigned To}="", NOT({Intern}))`;
    const findUrl = `${API}/${BASE_ID}/${ROLES_TABLE}?filterByFormula=${encodeURIComponent(formula)}&sort%5B0%5D%5Bfield%5D=Sort&sort%5B0%5D%5Bdirection%5D=asc`;
    const findRes = await fetch(findUrl, { headers: auth });
    if (!findRes.ok) return res.status(502).json({ ok: false, reason: "Airtable HTTP " + findRes.status });
    const found = (await findRes.json()).records || [];
    if (!found.length) return res.status(200).json({ ok: false, reason: "taken" });

    // try each open row: write, then verify we won (guards the two-at-once race)
    for (const rec of found) {
      const patch = await fetch(`${API}/${BASE_ID}/${ROLES_TABLE}/${rec.id}`, {
        method: "PATCH", headers: auth,
        body: JSON.stringify({ fields: { "Assigned To": name } }),
      });
      if (!patch.ok) continue;
      const check = await fetch(`${API}/${BASE_ID}/${ROLES_TABLE}/${rec.id}`, { headers: auth });
      const now = check.ok ? (await check.json()).fields || {} : {};
      if ((now["Assigned To"] || "") === name) {
        // success — log it to Signups as the paper trail (best-effort)
        fetch(`${API}/${BASE_ID}/${SIGNUPS_TABLE}`, {
          method: "POST", headers: auth,
          body: JSON.stringify({ fields: { Name: name, Role: role, Note: note, Status: "Approved" } }),
        }).catch(() => {});
        return res.status(200).json({ ok: true });
      }
      // someone else's write landed after ours — try the next open slot
    }
    return res.status(200).json({ ok: false, reason: "taken" });
  } catch (err) {
    return res.status(500).json({ ok: false, reason: String(err) });
  }
};
