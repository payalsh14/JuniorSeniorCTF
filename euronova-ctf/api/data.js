// Vercel serverless function: stores teams and room progress in Upstash Redis.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const JUDGE = process.env.JUDGE_PASSWORD;
const TEAMS = "euronova:teams", SUBS = "euronova:subs";

async function redis(cmd) {
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const slug = (n) => String(n).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clean = (v, n) => String(v || "").trim().slice(0, n);
function pairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) { try { out.push(JSON.parse(arr[i + 1])); } catch (e) {} }
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!URL_ || !TOKEN || !JUDGE) return res.status(500).json({ error: "Server not configured" });
  const b = req.body || {};
  try {
    if (b.action === "register" || b.action === "status") {
      const team = clean(b.team, 40), members = clean(b.members, 120);
      const cat = b.cat === "senior" ? "senior" : b.cat === "junior" ? "junior" : "";
      const key = slug(team);
      if (!key || !cat) return res.status(400).json({ error: "Bad team" });
      const old = await redis(["HGET", TEAMS, key]);
      const prev = old ? JSON.parse(old) : null;
      await redis(["HSET", TEAMS, key, JSON.stringify({ team, teamKey: key, members: members || (prev && prev.members) || "", cat, at: Date.now() })]);
      if (b.action === "status") {
        if (!/^[st][1-6]$/.test(b.task || "") || !["trying", "done"].includes(b.status)) return res.status(400).json({ error: "Bad status" });
        const field = key + "__" + b.task;
        const cur = await redis(["HGET", SUBS, field]);
        const d = cur ? JSON.parse(cur) : {};
        if (d.status === "done") return res.status(200).json({ ok: true });
        await redis(["HSET", SUBS, field, JSON.stringify({ team, teamKey: key, task: b.task, status: b.status, startedAt: d.startedAt || Date.now(), at: Date.now() })]);
      }
      return res.status(200).json({ ok: true });
    }
    if (b.password !== JUDGE) return res.status(401).json({ error: "Wrong password" });
    if (b.action === "list") {
      const [t, s] = await Promise.all([redis(["HGETALL", TEAMS]), redis(["HGETALL", SUBS])]);
      return res.status(200).json({ teams: pairs(t || []), subs: pairs(s || []) });
    }
    if (b.action === "delete") {
      const key = slug(b.teamKey || "");
      if (!key) return res.status(400).json({ error: "Bad team" });
      const fields = [];
      for (const p of ["t", "s"]) for (let i = 1; i <= 6; i++) fields.push(key + "__" + p + i);
      await redis(["HDEL", TEAMS, key]);
      await redis(["HDEL", SUBS, ...fields]);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
};
