const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const output = path.join(root, "dist");
const apiBase = process.env.QUIZ_API_BASE || "";
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
if (process.env.CI && (!apiBase || !publishableKey)) {
  throw new Error("Set repository variables QUIZ_API_BASE and SUPABASE_PUBLISHABLE_KEY before deploying.");
}
if (publishableKey && !publishableKey.startsWith("sb_publishable_")) {
  const payload = JSON.parse(Buffer.from(publishableKey.split(".")[1] || "", "base64url"));
  if (payload.role !== "anon") throw new Error("Only a publishable or anon key may be embedded in Pages.");
}
fs.mkdirSync(output, { recursive: true });
for (const file of ["index.html", "admin.html", "quiz-data.js", "api-client.js"]) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.writeFileSync(path.join(output, "app-config.js"), `window.QUIZ_CONFIG = ${JSON.stringify({ apiBase, publishableKey })};\n`);
fs.writeFileSync(path.join(output, ".nojekyll"), "");
const ismOutput = path.join(output, "shuaqi-ism");
fs.mkdirSync(ismOutput, { recursive: true });
for (const file of ["index.html", "admin.html", "quiz-data.js", "api-client.js"]) {
  fs.copyFileSync(path.join(root, "shuaqi-ism", file), path.join(ismOutput, file));
}
const ismBase = apiBase ? apiBase.replace(/\/quiz-api$/, "/shuaqi-api") : "";
fs.cpSync(path.join(root, "shuaqi-ism/assets"), path.join(ismOutput, "assets"), { recursive: true });
fs.writeFileSync(path.join(ismOutput, "app-config.js"), `window.QUIZ_CONFIG = ${JSON.stringify({ apiBase: ismBase, publishableKey })};\n`);
console.log("Pages artifact prepared: frontend files only.");
