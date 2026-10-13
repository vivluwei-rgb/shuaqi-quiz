const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { computeResult } = require("./quiz-data");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const PORT = Number(process.env.PORT || 8012);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function normalizePassword(value) {
  return String(value || "").trim().toUpperCase();
}

function randomCode(prefix = "SQ", length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < length; index += 1) {
    suffix += alphabet[crypto.randomInt(alphabet.length)];
  }
  return normalizePassword(`${prefix}-${suffix}`);
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const now = new Date().toISOString();
    const seed = {
      codes: [
        { code: "SQ2026", maxUses: 3, used: 0, active: true, createdAt: now },
        { code: "PLAY2026", maxUses: 3, used: 0, active: true, createdAt: now }
      ],
      attempts: [],
      results: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON 格式不正确"));
      }
    });
  });
}

function requireAdmin(req, res) {
  const password = req.headers["x-admin-password"];
  if (password !== ADMIN_PASSWORD) {
    sendJson(res, 401, { error: "后台密码不正确" });
    return false;
  }
  return true;
}

function publicResult(result, req) {
  const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
  return {
    id: result.id,
    createdAt: result.createdAt,
    result: result.result,
    shareUrl: `${origin}/r/${result.id}`
  };
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === "GET" && pathname.startsWith("/api/result/")) {
      const id = decodeURIComponent(pathname.split("/").pop());
      const db = readDb();
      const result = db.results.find(item => item.id === id);
      if (!result) return sendJson(res, 404, { error: "没有找到这个结果" });
      return sendJson(res, 200, publicResult(result, req));
    }

    if (req.method === "POST" && pathname === "/api/start") {
      const body = await readBody(req);
      const codeText = normalizePassword(body.password);
      const db = readDb();
      const code = db.codes.find(item => item.code === codeText);
      if (!code || !code.active) {
        return sendJson(res, 403, { error: "密码不存在或已停用" });
      }
      if (code.used >= code.maxUses) {
        return sendJson(res, 403, { error: "这个密码的 3 次测试机会已用完" });
      }

      code.used += 1;
      const attempt = {
        id: makeId("try"),
        code: code.code,
        createdAt: new Date().toISOString(),
        completed: false,
        resultId: null
      };
      db.attempts.push(attempt);
      writeDb(db);
      return sendJson(res, 200, {
        attemptToken: attempt.id,
        code: code.code,
        remaining: Math.max(0, code.maxUses - code.used)
      });
    }

    if (req.method === "POST" && pathname === "/api/complete") {
      const body = await readBody(req);
      const db = readDb();
      const attempt = db.attempts.find(item => item.id === body.attemptToken);
      if (!attempt) return sendJson(res, 403, { error: "测试会话不存在，请重新输入密码开始" });
      if (attempt.completed) return sendJson(res, 409, { error: "这次测试已经生成过结果" });

      const resultData = computeResult(body.answers);
      const result = {
        id: makeId("res"),
        code: attempt.code,
        answers: body.answers,
        result: resultData,
        createdAt: new Date().toISOString()
      };
      attempt.completed = true;
      attempt.resultId = result.id;
      db.results.push(result);
      writeDb(db);
      return sendJson(res, 200, publicResult(result, req));
    }

    if (pathname.startsWith("/api/admin/")) {
      if (!requireAdmin(req, res)) return;
      const db = readDb();

      if (req.method === "GET" && pathname === "/api/admin/state") {
        const results = db.results.slice().reverse().map(item => ({
          id: item.id,
          code: item.code,
          createdAt: item.createdAt,
          name: item.result.profile.name,
          playPercent: item.result.scores.playPercent,
          grindPercent: item.result.scores.grindPercent
        }));
        return sendJson(res, 200, {
          codes: db.codes,
          results,
          stats: {
            codes: db.codes.length,
            used: db.codes.reduce((sum, item) => sum + item.used, 0),
            capacity: db.codes.reduce((sum, item) => sum + item.maxUses, 0),
            results: db.results.length
          }
        });
      }

      if (req.method === "POST" && pathname === "/api/admin/codes") {
        const body = await readBody(req);
        const codeText = normalizePassword(body.code);
        const maxUses = Math.max(1, Number(body.maxUses || 3));
        if (!codeText) return sendJson(res, 400, { error: "请输入密码" });
        if (db.codes.some(item => item.code === codeText)) {
          return sendJson(res, 409, { error: "这个密码已存在" });
        }
        db.codes.push({
          code: codeText,
          maxUses,
          used: 0,
          active: true,
          createdAt: new Date().toISOString()
        });
        writeDb(db);
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "POST" && pathname === "/api/admin/codes/batch") {
        const body = await readBody(req);
        const count = Math.max(1, Math.min(1000, Number(body.count || 50)));
        const maxUses = Math.max(1, Number(body.maxUses || 3));
        const prefix = normalizePassword(body.prefix || "SQ").replace(/[^A-Z0-9]/g, "") || "SQ";
        const existing = new Set(db.codes.map(item => item.code));
        const created = [];
        const now = new Date().toISOString();

        while (created.length < count) {
          const codeText = randomCode(prefix, 8);
          if (existing.has(codeText)) continue;
          existing.add(codeText);
          const code = {
            code: codeText,
            maxUses,
            used: 0,
            active: true,
            createdAt: now
          };
          created.push(code);
          db.codes.push(code);
        }

        writeDb(db);
        return sendJson(res, 200, { ok: true, created: created.map(item => item.code) });
      }

      if (req.method === "POST" && pathname === "/api/admin/codes/update") {
        const body = await readBody(req);
        const code = db.codes.find(item => item.code === normalizePassword(body.code));
        if (!code) return sendJson(res, 404, { error: "密码不存在" });
        if (typeof body.active === "boolean") code.active = body.active;
        if (body.maxUses !== undefined) code.maxUses = Math.max(1, Number(body.maxUses));
        if (body.resetUsed) code.used = 0;
        writeDb(db);
        return sendJson(res, 200, { ok: true });
      }
    }

    sendJson(res, 404, { error: "接口不存在" });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "请求失败" });
  }
}

function serveStatic(req, res, pathname) {
  if (pathname.startsWith("/r/")) {
    res.writeHead(302, { location: `/index.html?result=${encodeURIComponent(pathname.split("/").pop())}` });
    res.end();
    return;
  }
  let filePath = pathname === "/" || pathname.startsWith("/r/") ? "/index.html" : pathname;
  filePath = decodeURIComponent(filePath).replace(/^\/+/, "");
  const absolute = path.resolve(ROOT, filePath);
  const allowedFiles = new Set(["index.html", "admin.html", "quiz-data.js", "app-config.js", "api-client.js"]);
  if (!allowedFiles.has(filePath) || !absolute.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(absolute, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(absolute)] || "application/octet-stream" });
    res.end(content);
  });
}

ensureDb();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url.pathname);
    return;
  }
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`测评网站已启动：http://127.0.0.1:${PORT}`);
  console.log(`管理后台：http://127.0.0.1:${PORT}/admin.html`);
  console.log(`默认后台密码：${ADMIN_PASSWORD}`);
});
