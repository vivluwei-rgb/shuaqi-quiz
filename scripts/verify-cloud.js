const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, ".deploy/public-config.json"), "utf8"));
const password = fs.readFileSync(path.join(root, ".deploy/admin-password.txt"), "utf8").trim();
const ref = new URL(config.apiBase).hostname.split(".")[0];
const code = "VERIFY-" + crypto.randomBytes(10).toString("hex").toUpperCase();
const supabase = path.join(process.env.LOCALAPPDATA, "QuizDeployTools/supabase-proxy/supabase.exe");
async function call(route, body, admin = false) {
  const response = await fetch(config.apiBase + "/api/" + route, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", apikey: config.publishableKey,
      origin: "https://vivluwei-rgb.github.io", ...(admin ? { "x-admin-password": password } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000)
  });
  return { status: response.status, data: await response.json() };
}
async function main() {
  assert.equal((await call("admin/state")).status, 401);
  const before = (await call("admin/state", null, true)).data;
  console.log(`Imported production data: ${before.stats.codes} codes, ${before.stats.results} results.`);
  try {
    assert.equal((await call("admin/codes", { code, maxUses: 3 }, true)).status, 200);
    const starts = await Promise.all(Array.from({ length: 5 }, () => call("start", { password: code })));
    assert.equal(starts.filter(r => r.status === 200).length, 3);
    assert.equal(starts.filter(r => r.status === 403).length, 2);
    console.log("Concurrent start check: exactly 3 of 5 requests succeeded.");
    const token = starts.find(r => r.status === 200).data.attemptToken;
    assert.equal((await call("complete", { attemptToken: token, answers: Array(10).fill(99) })).status, 400);
    const submissions = await Promise.all(Array.from({ length: 2 }, () => call("complete", {
      attemptToken: token, answers: Array(10).fill(1), result: { profile: { name: "FORGED" } }
    })));
    assert.equal(submissions[0].status, 200);
    assert.equal(submissions[1].status, 200);
    assert.equal(submissions[0].data.id, submissions[1].data.id);
    assert.notEqual(submissions[0].data.result.profile.name, "FORGED");
    const shared = await call("result/" + submissions[0].data.id);
    assert.equal(shared.status, 200);
    assert.equal(shared.data.id, submissions[0].data.id);
    console.log("Answers validated, scoring performed server-side, repeated submission idempotent, shared results public.");
    const dbUrl = `https://${ref}.supabase.co/rest/v1/`;
    const deniedRpc = await fetch(dbUrl + "rpc/quiz_dispatch", {
      method: "POST", headers: { apikey: config.publishableKey, authorization: `Bearer ${config.publishableKey}`, "content-type": "application/json" },
      body: JSON.stringify({ p_route: "admin/state", p_body: {} })
    });
    assert.equal(deniedRpc.status, 401);
    console.log("Direct anonymous database RPC is blocked.");
    for (const item of before.results) assert.equal((await call("result/" + item.id)).status, 200);
    console.log("Previously saved result links verified.");
  } finally {
    // Remove only the uniquely generated verification records, never customer data.
    const sql = `begin; delete from public.quiz_results where code = '${code}'; delete from public.quiz_attempts where code = '${code}'; delete from public.quiz_codes where code = '${code}'; commit;`;
    const cleanup = path.join(root, ".deploy/cleanup-verification.sql");
    fs.writeFileSync(cleanup, sql);
    execFileSync(supabase, ["db", "query", "--linked", "--project-ref", ref, "--file", cleanup, "--output", "json"], {
      cwd: root, encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"]
    });
    console.log("Temporary verification records removed.");
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
