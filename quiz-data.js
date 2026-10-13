(function initQuizData(root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = data;
  } else {
    root.QuizData = data;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function buildQuizData() {
  const questions = [
    {
      title: "周五晚上朋友临时约你出门，你第一反应是？",
      options: [
        { text: "去，妆可以路上补，快乐不能迟到", play: 10, grind: 1 },
        { text: "看明天有没有正事，没有就冲", play: 7, grind: 4 },
        { text: "先问几点结束，我要保住作息", play: 3, grind: 7 },
        { text: "不去，我已经和待办清单锁死了", play: 0, grind: 10 }
      ]
    },
    {
      title: "你拿到一个新机会，但规则还没完全清楚。",
      options: [
        { text: "边玩边试，先占坑再说", play: 8, grind: 3 },
        { text: "拉个小群问问懂的人", play: 6, grind: 6 },
        { text: "拆规则、列风险、做时间表", play: 2, grind: 10 },
        { text: "如果没明确收益，我先观望", play: 4, grind: 5 }
      ]
    },
    {
      title: "别人夸你“好像很松弛”，你心里想的是？",
      options: [
        { text: "终于被看出来了，我就是会过日子", play: 10, grind: 1 },
        { text: "表面松弛，背地也会偷偷用力", play: 6, grind: 7 },
        { text: "松弛是假象，我只是没让你看到焦虑", play: 2, grind: 10 },
        { text: "我不松弛，我只是懒得解释", play: 7, grind: 5 }
      ]
    },
    {
      title: "遇到一项需要长期坚持的计划，你最可能怎么做？",
      options: [
        { text: "先设计奖励机制，不好玩就坚持不了", play: 9, grind: 3 },
        { text: "设小目标，完成就允许自己放风", play: 7, grind: 6 },
        { text: "打卡、复盘、优化，越做越上头", play: 2, grind: 10 },
        { text: "三天热度也行，至少热过", play: 8, grind: 1 }
      ]
    },
    {
      title: "你对“人一定要上进”这句话的态度是？",
      options: [
        { text: "上进可以，但别把人活成 KPI", play: 8, grind: 5 },
        { text: "我认可，但我需要阶段性喘气", play: 6, grind: 7 },
        { text: "当然，人不卷一下会慌", play: 1, grind: 10 },
        { text: "上进不是唯一剧情，我也要体验人生", play: 10, grind: 2 }
      ]
    },
    {
      title: "旅行时你更像哪种人？",
      options: [
        { text: "随便走，迷路也是剧情", play: 10, grind: 1 },
        { text: "大方向定好，中间自由发挥", play: 8, grind: 5 },
        { text: "表格、路线、预算、备选方案齐全", play: 1, grind: 10 },
        { text: "嘴上随缘，手机里收藏了 80 个点", play: 5, grind: 8 }
      ]
    },
    {
      title: "当你发现自己落后别人一步时，你会？",
      options: [
        { text: "先安慰自己，每个人有自己的节奏", play: 9, grind: 2 },
        { text: "有点急，但会挑最有效的一步追", play: 5, grind: 8 },
        { text: "立刻补课，不追上睡不踏实", play: 1, grind: 10 },
        { text: "换赛道，我不想在别人的规则里输", play: 8, grind: 5 }
      ]
    },
    {
      title: "你发朋友圈或小红书时最在意什么？",
      options: [
        { text: "氛围好不好，自己看着开不开心", play: 10, grind: 1 },
        { text: "有没有表达真实的我", play: 8, grind: 4 },
        { text: "内容结构、标题、互动率", play: 2, grind: 10 },
        { text: "看心情，想发就发，不想营业", play: 9, grind: 2 }
      ]
    },
    {
      title: "临近 deadline，你的状态通常是？",
      options: [
        { text: "越到最后越有灵感，刺激", play: 8, grind: 5 },
        { text: "前面慢热，后面突然进入战斗模式", play: 5, grind: 8 },
        { text: "早就拆完了，最后只是在检查", play: 1, grind: 10 },
        { text: "如果任务没意义，我会很难启动", play: 7, grind: 4 }
      ]
    },
    {
      title: "如果把人生比作游戏，你最想拿到哪种技能？",
      options: [
        { text: "快乐雷达：哪里好玩自动导航", play: 10, grind: 1 },
        { text: "节奏大师：该冲该歇都精准", play: 7, grind: 7 },
        { text: "升级系统：努力必有反馈", play: 2, grind: 10 },
        { text: "反卷护盾：别人焦虑影响不到我", play: 9, grind: 3 }
      ]
    }
  ];

  const profiles = [
    {
      key: "purePlay",
      test: (p, g) => p >= 75 && g < 45,
      tag: "快乐优先型",
      name: "天赋耍起玩家",
      desc: "你不是不努力，你是非常清楚努力不能吞掉生活。你擅长把普通日子玩出剧情，也懂得用兴趣给自己充电。你的吸引力来自一种稀缺感：不被外界节奏完全牵走。",
      friend: "朋友觉得你像随身携带天气切换器，局面一闷，你就能把气氛调亮。",
      work: "你适合高自由度、需要创意和人感的任务。硬控你的不是 deadline，而是这件事有没有意思。",
      play: "用短途出逃、主题局、城市漫游给自己换电。你需要的是新鲜感，不是空耗。",
      love: "你喜欢能一起玩、一起笑、一起给生活加戏的人。太强的控制欲会让你迅速降温。",
      money: "别逼自己日更式自律。把赚钱动作设计成可展示、可反馈、可社交的玩法，你会更容易坚持。",
      advice: ["保留一个固定的低成本快乐入口", "把大目标拆成游戏关卡", "遇到焦虑型朋友时先保护边界"],
      quote: "我不是不卷，我只是要先确认这局值得我开大。"
    },
    {
      key: "hiddenGrind",
      test: (p, g) => p >= 55 && g >= 70,
      tag: "反差强者型",
      name: "表面耍起，背地卷王",
      desc: "你是最容易出爆款结果的类型：看起来随性，实际上很会算。你享受快乐，但也无法真的放弃掌控感。你的反差感很强，适合被做成朋友转发时那句“这不就是我吗”。",
      friend: "朋友以为你只是爱玩，熟了才发现你手机备忘录里藏着一整套人生运营系统。",
      work: "你适合需要审美、表达、商业敏感和执行力同时在线的事情。你最怕的不是忙，是忙得没有意义。",
      play: "你的耍起最好带一点产出感：探店、旅行、拍照、播客、内容选题，都能让快乐二次变现。",
      love: "你嘴上说随缘，心里其实会观察很多细节。真正打动你的人，既要有趣，也要稳定。",
      money: "你适合做个人 IP、内容产品或轻咨询。把你的体验、判断和方法论包装成别人愿意购买的答案。",
      advice: ["允许自己不把每次快乐都变成素材", "用 80 分交付替代无限优化", "给亲密关系留一点非效率空间"],
      quote: "你以为我在玩，其实我已经顺手把下一步想好了。"
    },
    {
      key: "balanced",
      test: (p, g) => Math.abs(p - g) <= 16,
      tag: "节奏掌控型",
      name: "会玩也会赢的节奏大师",
      desc: "你最迷人的地方是弹性：能耍起，也能上强度。你讨厌无效内耗，但不抗拒真正有回报的努力。别人以为你随便，其实你心里一直有一把节拍器。",
      friend: "朋友眼里你很好约、很好聊，但关键时刻又很靠谱，是能把松弛和执行力装进同一个人设里的人。",
      work: "你适合项目制和阶段性冲刺。只要目标清晰、反馈及时，你会进入非常漂亮的推进状态。",
      play: "最适合你的不是彻底放纵，而是有主题的放松：一边体验，一边获得灵感和连接。",
      love: "你需要一个尊重你节奏的人。太粘会累，太冷会烦，最好是彼此有生活，也愿意一起创造生活。",
      money: "你的优势是把兴趣变成系统。选一件你愿意长期分享的事，做成栏目、产品或服务。",
      advice: ["每周给自己安排一次无负担耍起", "重要目标只保留三个", "别因为能扛就自动多扛"],
      quote: "我可以很松弛，也可以很厉害，区别只是我想不想开这个模式。"
    },
    {
      key: "pureGrind",
      test: (p, g) => g >= 72 && p < 48,
      tag: "高压成长型",
      name: "卷王雷达全开的升级狂",
      desc: "你对成长、效率、结果非常敏感，松弛对你来说不是天赋，而是需要学习的技能。你的优势是稳定推进，风险是把人生每一刻都做成考核。",
      friend: "朋友觉得你靠谱、清醒、有计划，但有时也会想把你从待办清单里拽出来晒晒太阳。",
      work: "你很适合标准明确、回报可见、需要长期积累的赛道。你要警惕的是把自己卷到失去判断。",
      play: "你需要带恢复功能的耍起：散步、泡澡、看展、短途旅行，不以提升为目的。",
      love: "你容易被稳定、有行动力的人吸引，但也要练习接受关系里的不确定和慢节奏。",
      money: "你的执行力很强，适合做课程、训练营、项目管理、咨询和运营类产品。下一步是学会包装情绪价值。",
      advice: ["每天留 30 分钟不产出时间", "不要用别人的进度惩罚自己", "把休息写进计划，而不是等崩了再休"],
      quote: "我不是停不下来，我只是还没学会相信休息也算进步。"
    },
    {
      key: "drifter",
      test: () => true,
      tag: "自由摇摆型",
      name: "正在找节奏的生活实验家",
      desc: "你既不想被卷走，也不想彻底摆烂。你更像一个还在调参的人：某些时候想玩，某些时候想赢，真正困住你的不是能力，而是不确定自己该在哪件事上用力。",
      friend: "朋友觉得你有很多可能性，只是开关有点随机。你一旦找到喜欢的事，会突然变得很有能量。",
      work: "你适合先做小实验，再决定是否长期投入。不要一上来就把自己绑进宏大计划。",
      play: "用低门槛、新鲜、有反馈的小活动打开状态，比如一天城市任务、一小时兴趣挑战。",
      love: "你需要能让你安心探索的人。太强压迫感会让你逃，太没反馈又会让你怀疑。",
      money: "先用 7 天小项目验证兴趣和需求，再决定要不要加码。你的关键词是试错，不是硬撑。",
      advice: ["把想做的事缩成 7 天版本", "每次只选一个方向加码", "记录让你变有能量的人和场景"],
      quote: "我不是没方向，我是在等那个值得我认真起来的信号。"
    }
  ];

  function computeResult(answers) {
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      throw new Error("答案数量不完整");
    }

    let play = 0;
    let grind = 0;
    const answerTexts = answers.map((answer, index) => {
      const selected = questions[index].options[Number(answer)];
      if (!selected) {
        throw new Error("答案选项无效");
      }
      play += selected.play;
      grind += selected.grind;
      return selected.text;
    });

    const playPercent = Math.round(play / questions.length * 10);
    const grindPercent = Math.round(grind / questions.length * 10);
    const twist = Math.min(96, Math.round(100 - Math.abs(playPercent - grindPercent) * .72));
    const profile = profiles.find(item => item.test(playPercent, grindPercent));

    return {
      profileKey: profile.key,
      profile,
      scores: { play, grind, playPercent, grindPercent, twist },
      answers: answerTexts,
      shareText: `我测出来是「${profile.name}」\n耍起能量 ${playPercent}%｜卷王雷达 ${grindPercent}%｜反差萌 ${twist}%\n${profile.quote}\n\n说真的，这个结果有点懂我。`
    };
  }

  return { questions, profiles, computeResult };
});
