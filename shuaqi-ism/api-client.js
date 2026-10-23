(function () {
  const config = window.QUIZ_CONFIG || {};
  const legacyResult = location.pathname.match(/\/r\/[^/]+\/?$/);
  const base = legacyResult ? new URL("../../", location.href) : new URL("./", location.href);
  window.QuizApi = {
    homeUrl: new URL("index.html", base).href,
    resultUrl(id) {
      const url = new URL("index.html", base);
      url.searchParams.set("result", id);
      return url.href;
    },
    async request(path, options = {}) {
      if (!config.apiBase && !["localhost", "127.0.0.1"].includes(location.hostname)) {
        throw new Error("网站服务尚未配置，请联系店铺客服");
      }
      const headers = { "content-type": "application/json", ...(options.headers || {}) };
      if (config.publishableKey) headers.apikey = config.publishableKey;
      const response = await fetch(`${(config.apiBase || "").replace(/\/$/, "")}${path}`, {
        ...options, headers
      });
      let data;
      try { data = await response.json(); } catch {
        throw new Error("服务暂时无法连接，请稍后重试");
      }
      if (!response.ok) throw new Error(data.error || "请求失败");
      if (data.id && data.result) data.shareUrl = this.resultUrl(data.id);
      return data;
    }
  };
})();

