# 你是哪种耍起主义

维C闹腾片播客互动测评。题目、报告文案和计分规则来自用户提供的同名 Word 文档。

- 前台：`https://vivluwei-rgb.github.io/shuaqi-quiz/shuaqi-ism/`
- 后台：同一地址下的 `admin.html`
- 15 道题，每题单选，支持上一题重新选择。
- 四种结果：耍中找钱、找钱来耍、找耍结合、以耍为主。
- 三个趣味指数：耍起含量、钱包护航值、快乐变现脑。
- 每个新密码默认 3 次，后台支持单个及批量生成、停用和重置。
- 支持长图下载、结果链接分享、再测一次及好评提示。

## Independent Data

使用独立 Supabase Edge Function `shuaqi-api`，调用 `shuaqi_dispatch`。
数据保存在 `shuaqi_codes`、`shuaqi_attempts`、`shuaqi_results`，与旧站 `quiz_*` 数据隔离。
管理密码沿用 Supabase Secret `QUIZ_ADMIN_PASSWORD`，前端不保存服务密钥。

## Content and Scoring

`quiz-data.js` 仅包含公开题目和四种报告文案。
权重矩阵位于 `supabase/functions/shuaqi-api/scoring-rules.json`，只由后端 `scoring.js` 使用，不进入 GitHub Pages 静态产物。
五维按各题极值总和进行标准化；画像计算使用未四舍五入的维度分数，三个趣味指数才取整。
同分优先级：找耍结合、耍中找钱、找钱来耍、以耍为主。

## Build and Verify

运行 `node --test tests/*.test.js` 验证四条倾向路径、同分规则、随机分型及旧站兼容性。
运行 `node scripts/prepare-shuaqi-functions.js` 准备云函数题库，再部署 `shuaqi-api`。
前端由现有 GitHub Pages 工作流自动构建，新站单独发布在 `shuaqi-ism/` 子路径。
如需本地预览，先构建静态页面，再运行 `node scripts/preview-static.js`；该预览不会连接本地旧测评数据库。
