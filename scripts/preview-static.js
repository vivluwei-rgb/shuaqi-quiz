const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../dist");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webp": "image/webp" };
http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  let filename;
  try { filename = path.resolve(root, "." + decodeURIComponent(url.pathname) + (url.pathname.endsWith("/") ? "index.html" : "")); }
  catch { res.writeHead(400).end(); return; }
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(filename, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": mime[path.extname(filename)] || "application/octet-stream" });
    res.end(content);
  });
}).listen(Number(process.env.PORT || 8014), "127.0.0.1", () => console.log("Static preview: http://127.0.0.1:" + (process.env.PORT || 8014) + "/shuaqi-ism/"));
