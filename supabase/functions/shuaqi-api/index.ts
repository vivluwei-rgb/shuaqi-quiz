import "./quiz-data.js";
import "./scoring.js";
import rules from "./scoring-rules.json" with { type: "json" };
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const quiz = (globalThis as any).QuizData;
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminPassword = Deno.env.get("QUIZ_ADMIN_PASSWORD") || "";
const origins = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function sameSecret(input: string, expected: string) {
  const encode = new TextEncoder();
  const [a, b] = await Promise.all([input, expected].map(s => crypto.subtle.digest("SHA-256", encode.encode(s))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  const cors = {
    "Access-Control-Allow-Origin": origins.includes(origin) ? origin : (origins[0] || ""),
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-admin-password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), {
    status, headers: { ...cors, "content-type": "application/json; charset=utf-8" }
  });
  if (origin && !origins.includes(origin)) return json(403, { error: "此网站未获授权" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    const path = new URL(req.url).pathname.split("/shuaqi-api")[1] || "";
    let route = path.replace(/^\/api\//, "");
    const admin = route.startsWith("admin/");
    if (admin) {
      if (adminPassword.length < 16) return json(503, { error: "后台服务尚未配置" });
      if (!await sameSecret(req.headers.get("x-admin-password") || "", adminPassword)) {
        return json(401, { error: "后台密码不正确" });
      }
    }
    const isResult = route.startsWith("result/");
    const getRoute = route === "admin/state" || isResult;
    if (req.method !== (getRoute ? "GET" : "POST")) return json(405, { error: "请求方法不支持" });
    const allowed = ["start", "complete", "admin/state", "admin/codes", "admin/codes/batch", "admin/codes/update"];
    if (!isResult && !allowed.includes(route)) return json(404, { error: "接口不存在" });
    let body: any = {};
    if (req.method === "POST") {
      const raw = await req.text();
      if (raw.length > 16384) return json(413, { error: "请求内容过大" });
      body = JSON.parse(raw || "{}");
      if (!body || Array.isArray(body) || typeof body !== "object") return json(400, { error: "请求格式不正确" });
    }
    if (isResult) { body = { id: decodeURIComponent(route.slice(7)) }; route = "result"; }
    if (route === "complete") {
      if (!Array.isArray(body.answers) || body.answers.length !== quiz.questions.length ||
        body.answers.some((value: unknown, i: number) => !Number.isInteger(value) ||
          (value as number) < 0 || (value as number) >= quiz.questions[i].options.length)) {
        return json(400, { error: "请完成全部题目再提交" });
      }
      // Ignore any client-provided score; calculate on the server.
      body = { attemptToken: body.attemptToken, answers: body.answers, result: (globalThis as any).ShuaqiScoring.computeResult(body.answers, quiz, rules) };
    }
    for (const field of ["maxUses", "count"]) {
      if (body[field] !== undefined && (!Number.isInteger(Number(body[field])) || Number(body[field]) < 1 || Number(body[field]) > 1000)) {
        return json(400, { error: "次数和数量必须是 1 到 1000 的整数" });
      }
    }
    if (body.active !== undefined && typeof body.active !== "boolean") return json(400, { error: "状态格式不正确" });
    if (body.resetUsed !== undefined && typeof body.resetUsed !== "boolean") return json(400, { error: "重置格式不正确" });
    const { data, error } = await db.rpc("shuaqi_dispatch", { p_route: route, p_body: body });
    if (error) { console.error("Database operation failed", error.code); return json(500, { error: "服务暂时繁忙，请稍后重试" }); }
    const { status = 200, ...payload } = data;
    return json(status, payload);
  } catch (error) {
    if (error instanceof SyntaxError) return json(400, { error: "请求格式不正确" });
    console.error("Quiz API failed", error instanceof Error ? error.name : "Unknown");
    return json(500, { error: "服务暂时无法连接，请稍后重试" });
  }
});

