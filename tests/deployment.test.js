const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const client = fs.readFileSync(path.join(root, "api-client.js"), "utf8");

function loadClient(href, config = {}, fetch = async () => {}) {
  const location = new URL(href);
  const window = { QUIZ_CONFIG: config };
  vm.runInNewContext(client, { window, location, URL, fetch });
  return window.QuizApi;
}

test("shared links retain the GitHub Pages repository directory", () => {
  const api = loadClient("https://vivluwei-rgb.github.io/shuaqi-quiz/admin.html");
  assert.equal(api.resultUrl("res_123"), "https://vivluwei-rgb.github.io/shuaqi-quiz/index.html?result=res_123");
  assert.equal(api.homeUrl, "https://vivluwei-rgb.github.io/shuaqi-quiz/index.html");
});

test("cloud requests retain admin authentication and use frontend share URLs", async () => {
  let captured;
  const api = loadClient("https://vivluwei-rgb.github.io/shuaqi-quiz/index.html", {
    apiBase: "https://example.supabase.co/functions/v1/quiz-api/", publishableKey: "sb_publishable_test"
  }, async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ id: "res_123", result: { profile: {} } }) };
  });
  const data = await api.request("/api/complete", { method: "POST", headers: { "x-admin-password": "example" } });
  assert.equal(captured.url, "https://example.supabase.co/functions/v1/quiz-api/api/complete");
  assert.equal(captured.options.headers["x-admin-password"], "example");
  assert.equal(captured.options.headers.apikey, "sb_publishable_test");
  assert.equal(data.shareUrl, "https://vivluwei-rgb.github.io/shuaqi-quiz/index.html?result=res_123");
});

test("an unconfigured published frontend fails with a useful message", async () => {
  const api = loadClient("https://vivluwei-rgb.github.io/shuaqi-quiz/");
  await assert.rejects(api.request("/api/start"), /网站服务尚未配置/);
});

test("Pages build includes only frontend assets", () => {
  execFileSync(process.execPath, ["scripts/build-pages.js"], {
    cwd: root, env: { ...process.env, CI: "", QUIZ_API_BASE: "", SUPABASE_PUBLISHABLE_KEY: "" }
  });
  assert.deepEqual(fs.readdirSync(path.join(root, "dist")).sort(), [
    ".nojekyll", "admin.html", "api-client.js", "app-config.js", "index.html", "quiz-data.js", "shuaqi-ism"
  ]);
});

test("Pages build refuses to expose a service-role key", () => {
  const key = "header." + Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url") + ".signature";
  assert.throws(() => execFileSync(process.execPath, ["scripts/build-pages.js"], {
    cwd: root, env: { ...process.env, CI: "", QUIZ_API_BASE: "https://example.supabase.co/functions/v1/quiz-api", SUPABASE_PUBLISHABLE_KEY: key }, stdio: "pipe"
  }), /Only a publishable or anon key/);
});

test("HTML inline scripts are syntactically valid", () => {
  for (const file of ["index.html", "admin.html", "shuaqi-ism/index.html", "shuaqi-ism/admin.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      new vm.Script(match[1], { filename: file });
    }
  }
});
