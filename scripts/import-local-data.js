const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally. Never commit the service key.");
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/db.json"), "utf8"));
  const mappings = [
    ["quiz_codes", data.codes.map(row => ({ code: row.code, max_uses: row.maxUses, used: row.used, active: row.active, created_at: row.createdAt }))],
    ["quiz_attempts", data.attempts.map(row => ({ id: row.id, code: row.code, created_at: row.createdAt, completed: row.completed, result_id: row.resultId }))],
    ["quiz_results", data.results.map(row => ({ id: row.id, code: row.code,
      attempt_id: data.attempts.find(attempt => attempt.resultId === row.id)?.id || null,
      answers: row.answers, result: row.result, created_at: row.createdAt }))]
  ];
  for (const [table, rows] of mappings) {
    for (let index = 0; index < rows.length; index += 500) {
      const response = await fetch(`${url}/rest/v1/${table}?on_conflict=${table === "quiz_codes" ? "code" : "id"}`, {
        method: "POST",
        headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json",
          prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(rows.slice(index, index + 500))
      });
      if (!response.ok) throw new Error(`Import failed for ${table} (HTTP ${response.status}).`);
    }
    console.log(`${table}: processed ${rows.length} local records without overwriting existing records.`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
