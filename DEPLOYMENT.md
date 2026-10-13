# GitHub Pages + Supabase

前端只上传 `dist/` 中的静态页面。数据库、测评密码和服务密钥不上传至 GitHub。

## Supabase

1. 创建项目，将 `supabase/migrations/202610130001_quiz.sql` 应用到数据库。
2. 执行 `node scripts/prepare-functions.js`，然后部署 `quiz-api` Edge Function。函数配置为 `verify_jwt = false`，顾客使用测评密码访问，管理员由函数验证后台密码。
3. 在函数 Secrets 中配置 `QUIZ_ADMIN_PASSWORD`（至少 16 位）及 `ALLOWED_ORIGINS`（例如 `https://vivluwei-rgb.github.io`）。Supabase 自带的服务密钥仅在函数中使用。
4. 本机环境变量配置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 后，执行 `node scripts/import-local-data.js` 迁移现有数据。脚本不会覆盖已有记录。

## GitHub

1. 创建网站专用仓库，将源码推送到 `main`。
2. 仓库 Settings > Pages 选择 GitHub Actions。
3. 仓库 Actions variables 配置：
   - `QUIZ_API_BASE`：`https://项目编号.supabase.co/functions/v1/quiz-api`
   - `SUPABASE_PUBLISHABLE_KEY`：项目公开 publishable key 或 anon key。
4. 运行 Deploy quiz to GitHub Pages 工作流。后台地址为网站地址加 `admin.html`，结果使用 `index.html?result=结果编号`。

## Verification

执行 `node --test tests/*.test.js`。上线后验证密码恰好可开始三次、并发扣次、重复提交返回同一结果、分享页可在未登录窗口查看，以及后台批量新增密码。

## Local Preview

执行 `node server.js` 后访问 `http://127.0.0.1:8012/`。根目录的 `app-config.js` 默认使用本地 API，不受云端配置影响。
