const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const content = require("../shuaqi-ism/quiz-data");
const rules = require("../supabase/functions/shuaqi-api/scoring-rules.json");
const { computeResult, rankProfiles } = require("../supabase/functions/shuaqi-api/scoring");
const paths = {
  earn: [3,1,3,0,1,2,3,1,0,2,2,1,0,3,2],
  fund: [2,3,0,2,3,0,1,3,1,3,3,0,2,1,0],
  balance: [0,2,1,1,0,3,2,0,3,0,1,2,3,0,3],
  play: [1,0,2,3,2,1,0,2,2,1,0,3,1,2,1]
};

test("all 15 document questions contain four options and five-dimensional weights", () => {
  assert.equal(content.questions.length, 15);
  assert.equal(rules.weights.length, 15);
  content.questions.forEach((question, i) => {
    assert.equal(question.options.length, 4);
    assert.equal(rules.weights[i].length, 4);
    rules.weights[i].forEach(weight => {
      assert.equal(weight.length, 5);
      weight.forEach(value => assert.ok(Number.isInteger(value) && value >= 0 && value <= 3));
    });
  });
  assert.deepEqual(rules.weights[0], [[1,1,3,2,3], [0,0,0,3,2], [0,3,1,1,3], [3,1,1,2,2]]);
});

for (const [key, answers] of Object.entries(paths)) {
  test(`document tendency path produces ${key}`, () => {
    const result = computeResult(answers, content, rules);
    assert.equal(result.profileKey, key);
    assert.equal(result.quizVersion, "shuaqi-ism-v1");
    assert.equal(result.answers.length, 15);
    assert.ok(result.profile.strength && result.profile.flaw && result.profile.advice && result.profile.quote);
  });
}

test("matching scores resolve ties using the document's stable priority", () => {
  assert.equal(rankProfiles({ V: 6500 / 73, K: 100, H: 100, L: 100, R: 100 }, rules.tieOrder), "balance");
});

test("malformed or incomplete answers cannot generate a report", () => {
  for (const input of [null, [], Array(14).fill(0), Array(15).fill(4), Array(15).fill("1"), Array(15).fill(null)]) {
    assert.throws(() => computeResult(input, content, rules), /请完成全部题目/);
  }
});

test("all profiles are reachable with random answers and indices stay between 0 and 100", () => {
  let seed = 20261023;
  const seen = new Set();
  for (let count = 0; count < 10000; count++) {
    const answers = Array.from({ length: 15 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed >>> 30;
    });
    const result = computeResult(answers, content, rules);
    seen.add(result.profileKey);
    for (const index of Object.values(result.scores)) assert.ok(Number.isInteger(index) && index >= 0 && index <= 100);
  }
  assert.deepEqual([...seen].sort(), Object.keys(paths).sort());
});

test("public content omits the scoring rules and published copy omits old quiz labels", () => {
  assert.deepEqual(Object.keys(content).sort(), ["meta", "profiles", "questions"]);
  const html = fs.readFileSync(path.join(__dirname, "../shuaqi-ism/index.html"), "utf8");
  for (const phrase of ["更偏卷王", "更偏耍起", "computeResult", "朋友眼中的你", "1/10", "0.73"]) {
    assert.equal(html.includes(phrase), false, phrase);
  }
  assert.ok(html.includes("你的厉害") && html.includes("钱包护航值"));
});
