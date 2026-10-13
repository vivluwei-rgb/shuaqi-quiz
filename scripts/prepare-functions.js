const fs = require("node:fs");
const path = require("node:path");
fs.copyFileSync(path.join(__dirname, "../quiz-data.js"), path.join(__dirname, "../supabase/functions/quiz-api/quiz-data.js"));
console.log("Shared quiz scoring prepared for Supabase.");
