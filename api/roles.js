// Vercel serverless function: /api/roles
// Fetches the APC volunteer roles from Airtable server-side.
// The token lives in a Vercel environment variable (AIRTABLE_TOKEN),
// so it never appears in the page source or the git repo.

const BASE_ID = "appULR9ueveTBZjAI";
const TABLE_ID = "tblA5UXs2v0Q3GDPV";

module.exports = async (req, res) => {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "AIRTABLE_TOKEN env var not set" });
  }
  try {
    let records = [];
    let offset = null;
    let guard = 0;
    do {
      const url =
        `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100` +
        (offset ? `&offset=${encodeURIComponent(offset)}` : "");
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        return res.status(502).json({ error: "Airtable HTTP " + r.status });
      }
      const data = await r.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;
    } while (offset && ++guard < 10);

    // cache at the edge for 60s so refresh-spamming on market day is cheap
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ records });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
