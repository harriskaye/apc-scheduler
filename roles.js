// Vercel serverless function: /api/roles
// Serves the APC volunteer roles AND signup requests from Airtable server-side.
// The token lives in the AIRTABLE_TOKEN environment variable only.

const BASE_ID = "appULR9ueveTBZjAI";
const ROLES_TABLE = "tblA5UXs2v0Q3GDPV";
const SIGNUPS_TABLE = "tblDrBVb3zleqYOIl";

async function fetchAll(token, tableId) {
  let records = [];
  let offset = null;
  let guard = 0;
  do {
    const url =
      `https://api.airtable.com/v0/${BASE_ID}/${tableId}?pageSize=100` +
      (offset ? `&offset=${encodeURIComponent(offset)}` : "");
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error("Airtable HTTP " + r.status + " (" + tableId + ")");
    const data = await r.json();
    records = records.concat(data.records || []);
    offset = data.offset || null;
  } while (offset && ++guard < 10);
  return records;
}

module.exports = async (req, res) => {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "AIRTABLE_TOKEN env var not set" });
  }
  try {
    const [roleRecords, signupRecords] = await Promise.all([
      fetchAll(token, ROLES_TABLE),
      fetchAll(token, SIGNUPS_TABLE).catch(() => []), // signups table missing shouldn't kill the schedule
    ]);

    // only expose what the page needs from signups: role, first name, status
    const signups = signupRecords.map((rec) => ({
      role: (rec.fields && rec.fields["Role"]) || "",
      name: (rec.fields && rec.fields["Name"]) || "",
      status: (rec.fields && rec.fields["Status"]) || "New",
    }));

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    return res.status(200).json({ records: roleRecords, signups });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
