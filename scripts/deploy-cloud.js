const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const tools = path.join(process.env.LOCALAPPDATA, "QuizDeployTools");
const supabase = path.join(tools, "supabase-proxy/supabase.exe");
const gh = path.join(tools, "gh/bin/gh.exe");
const ref = process.env.QUIZ_PROJECT_REF;
const repo = process.env.QUIZ_GITHUB_REPO;
if (!ref || !repo) throw new Error("Set QUIZ_PROJECT_REF and QUIZ_GITHUB_REPO.");
const staging = path.join(root, ".deploy");
fs.mkdirSync(staging, { recursive: true });
const passwordFile = path.join(staging, "admin-password.txt");
const password = fs.existsSync(passwordFile) ? fs.readFileSync(passwordFile, "utf8").trim() : crypto.randomBytes(24).toString("base64url");
fs.writeFileSync(passwordFile, password + "\n");
const owner = repo.split("/")[0];
const secretFile = path.join(staging, "cloud.env");
fs.writeFileSync(secretFile, `QUIZ_ADMIN_PASSWORD=${password}\nALLOWED_ORIGINS=https://${owner}.github.io,http://127.0.0.1:8013\n`);
function run(file, args, extra = {}) {
  return execFileSync(file, args, { cwd: root, encoding: "utf8", timeout: 180000, ...extra });
}
run(supabase, ["secrets", "set", "--project-ref", ref, "--env-file", secretFile]);
console.log("Cloud administrator password configured; retained only in ignored local deployment files.");
run(process.execPath, ["scripts/prepare-functions.js"]);
console.log(run(supabase, ["functions", "deploy", "quiz-api", "--project-ref", ref, "--no-verify-jwt", "--use-api"]));
const keys = JSON.parse(run(supabase, ["projects", "api-keys", "--project-ref", ref, "--output", "json"]));
const publicKey = keys.find(key => key.name === "anon" || key.type === "publishable")?.api_key;
const serviceKey = keys.find(key => key.name === "service_role")?.api_key;
if (!publicKey || !serviceKey) throw new Error("Required project keys were not returned.");
const url = `https://${ref}.supabase.co`;
console.log(run(process.execPath, ["scripts/import-local-data.js"], {
  env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey }
}));
for (const [name, value] of [["QUIZ_API_BASE", `${url}/functions/v1/quiz-api`], ["SUPABASE_PUBLISHABLE_KEY", publicKey]]) {
  run(gh, ["variable", "set", name, "--repo", repo], { input: value });
}
fs.writeFileSync(path.join(staging, "public-config.json"), JSON.stringify({ apiBase: `${url}/functions/v1/quiz-api`, publishableKey: publicKey }));
console.log("GitHub Pages variables configured. No service-role key is written to disk or GitHub.");
