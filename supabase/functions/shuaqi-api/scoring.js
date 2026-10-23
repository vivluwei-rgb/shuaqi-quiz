(function (root, factory) {
  const scoring = factory();
  if (typeof module === "object" && module.exports) module.exports = scoring;
  else root.ShuaqiScoring = scoring;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function rankProfiles(dimensions, order) {
    const { V, K, H, L, R } = dimensions;
    const matches = {
      earn: .73 * V + .18 * L + .09 * H + 8,
      fund: .73 * K + .17 * R + .10 * L,
      balance: .70 * H + .20 * R + .10 * L,
      play: .73 * L + .20 * (100 - K) + .07 * R
    };
    // Use unrounded dimensions for classification; rounding is display-only.
    let winner = order[0];
    for (const key of order) {
      if (matches[key] > matches[winner] + 1e-9) winner = key;
    }
    return winner;
  }

  function computeResult(answers, content, rules) {
    if (!Array.isArray(answers) || answers.length !== content.questions.length ||
      answers.some((answer, i) => !Number.isInteger(answer) || answer < 0 || answer >= content.questions[i].options.length)) {
      throw new Error("请完成全部题目再提交");
    }
    const raw = rules.dimensions.map(() => 0);
    const min = raw.slice(), max = raw.slice();
    rules.weights.forEach((options, index) => {
      rules.dimensions.forEach((_, dimension) => {
        raw[dimension] += options[answers[index]][dimension];
        min[dimension] += Math.min(...options.map(option => option[dimension]));
        max[dimension] += Math.max(...options.map(option => option[dimension]));
      });
    });
    const dimensions = Object.fromEntries(rules.dimensions.map((key, index) => [key,
      max[index] === min[index] ? 0 : 100 * (raw[index] - min[index]) / (max[index] - min[index])
    ]));
    const profileKey = rankProfiles(dimensions, rules.tieOrder);
    const profile = content.profiles.find(item => item.key === profileKey);
    const { V, K, H, L, R } = dimensions;
    const scores = {
      playContent: Math.round(.15 * V + .15 * K + .25 * H + .45 * L),
      walletGuard: Math.round(.20 * K + .25 * H + .55 * R),
      happyBusiness: Math.round(.75 * V + .15 * H + .10 * L)
    };
    return {
      quizVersion: content.meta.version, profileKey, profile, scores,
      answers: answers.map((answer, index) => content.questions[index].options[answer].text),
      shareText: `我的耍起主义是「${profile.name}」\n${profile.title}\n耍起含量 ${scores.playContent}%｜钱包护航值 ${scores.walletGuard}%｜快乐变现脑 ${scores.happyBusiness}%\n${profile.quote}`
    };
  }
  return { computeResult, rankProfiles };
});
