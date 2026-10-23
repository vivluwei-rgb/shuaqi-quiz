const fs = require("node:fs");
const path = require("node:path");
fs.copyFileSync(path.join(__dirname, "../shuaqi-ism/quiz-data.js"), path.join(__dirname, "../supabase/functions/shuaqi-api/quiz-data.js"));
console.log("Independent Shuaqi content prepared for Supabase.");
