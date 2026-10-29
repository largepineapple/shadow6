/* Demo uses local rules, not a model. All text and images stay in this browser. */
(() => {
  "use strict";
  const app = document.querySelector("#app");
  const homeButton = document.querySelector("#home-button");
  const STORAGE_KEY = "take-note-draft-v1";
  const roles = ["成品特写", "制作过程", "店内环境"];
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const art = (kind = 0) => {
    const background = ["#d7cbbd", "#c6d5d6", "#d0cbbf"][kind];
    const drawing =
      kind === 0
        ? '<ellipse cx="320" cy="355" rx="180" ry="43" fill="#b4a696"/><ellipse cx="320" cy="315" rx="140" ry="29" fill="#f6f0e8"/><rect x="249" y="172" width="142" height="143" rx="35" fill="#f8f5ed"/><path d="M391 195c95-10 95 103 0 94" fill="none" stroke="#f8f5ed" stroke-width="24"/><ellipse cx="320" cy="179" rx="70" ry="22" fill="#86583e"/><path d="M285 179q35-32 70 0q-35 23-70 0" fill="#ecd3b0"/><path d="M295 130q-20-25 0-50m40 45q-20-25 0-50" stroke="#f8f5ed" stroke-width="5" fill="none" opacity=".7"/>'
        : kind === 1
          ? '<rect x="140" y="135" width="340" height="210" rx="18" fill="#344f56"/><rect x="165" y="155" width="290" height="65" rx="7" fill="#728c8e"/><circle cx="210" cy="185" r="16" fill="#dae5df"/><path d="M320 220v35m-35 0h70" stroke="#e8e7dd" stroke-width="13"/><rect x="275" y="282" width="90" height="64" rx="15" fill="#f8f5ed"/><path d="M320 258v23" stroke="#8c5d39" stroke-width="5"/><rect x="120" y="348" width="390" height="24" rx="5" fill="#9caeae"/>'
          : '<rect x="100" y="50" width="440" height="290" rx="5" fill="#f0eee2"/><rect x="130" y="75" width="180" height="220" fill="#a9c1b0"/><path d="M220 75v220m-90-110h180" stroke="#f0eee2" stroke-width="9"/><path d="M115 295h210l30 95H85z" fill="#b29373"/><rect x="411" y="245" width="24" height="130" fill="#64806e"/><path d="M424 260q-90-30-60-90q75 5 60 90m0-40q70-80 85-20q-20 60-85 20" fill="#7e9c79"/><path d="M390 330h65l-9 60h-48z" fill="#ac7f63"/>';
    return (
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440"><rect width="640" height="440" fill="${background}"/>${drawing}<text x="32" y="410" fill="#ffffff" opacity=".75" font-family="Arial" font-size="11" letter-spacing="3">TAKE NOTE / DEMO MATERIAL</text></svg>`,
      )
    );
  };
  const emptyAssets = () =>
    roles.map((role) => ({ role, src: "", sample: false }));
  let state = {
    screen: "home",
    step: 1,
    assets: emptyAssets(),
    facts: {
      product: "",
      price: "",
      feature: "",
      goal: "新品介绍",
      voice: "像和熟客聊天",
    },
    confirmed: false,
    failNext: false,
    error: "",
    fileError: "",
    shots: [],
    previous: {},
    saved: false,
    activeShot: 0,
    playing: false,
  };
  let generationTimer = null,
    progressTimer = null,
    previewTimer = null,
    toastTimer = null;
  const uploadVersions = [0, 0, 0];
  function notify(message) {
    const el = document.querySelector("#toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 4000);
  }
  function stopPreview() {
    clearInterval(previewTimer);
    previewTimer = null;
    state.playing = false;
  }
  function stopGeneration() {
    clearTimeout(generationTimer);
    clearInterval(progressTimer);
    generationTimer = progressTimer = null;
  }
  function savedDraft() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (
        value?.version !== 1 ||
        !Array.isArray(value.shots) ||
        value.shots.length !== 3 ||
        !value.facts
      )
        return null;
      if (
        value.shots.some(
          (s) =>
            typeof s.text !== "string" ||
            s.text.length > 220 ||
            !Number.isInteger(s.assetIndex) ||
            s.assetIndex < 0 ||
            s.assetIndex > 2,
        )
      )
        return null;
      if (
        typeof value.facts.product !== "string" ||
        !value.facts.product.trim() ||
        value.facts.product.length > 30 ||
        typeof value.facts.feature !== "string" ||
        value.facts.feature.length > 80 ||
        typeof value.facts.price !== "string"
      )
        return null;
      if (
        value.shots.some(
          (s) => typeof s.direction !== "string" || s.direction.length > 200,
        )
      )
        return null;
      if (
        !["新品介绍", "邀请来店"].includes(value.facts.goal) ||
        !["像和熟客聊天", "清爽直接"].includes(value.facts.voice)
      )
        return null;
      return value;
    } catch {
      return null;
    }
  }
  function sample() {
    uploadVersions.forEach((_, i) => {
      uploadVersions[i]++;
    });
    state.assets.forEach((a) => {
      if (a.src.startsWith("blob:")) URL.revokeObjectURL(a.src);
    });
    state = {
      ...state,
      screen: "work",
      step: 1,
      assets: roles.map((role, i) => ({ role, src: art(i), sample: true })),
      facts: {
        product: "燕麦拿铁",
        price: "28",
        feature: "现磨咖啡搭配燕麦奶，可做热饮或冰饮",
        goal: "新品介绍",
        voice: "像和熟客聊天",
      },
      confirmed: false,
      shots: [],
      previous: {},
      error: "",
      fileError: "",
      saved: false,
    };
    render();
  }
  function home() {
    captureFacts();
    uploadVersions.forEach((_, i) => {
      uploadVersions[i]++;
    });
    state.assets.forEach((a) => {
      a.pending = false;
    });
    stopGeneration();
    stopPreview();
    state.screen = "home";
    render();
  }
  const stepRail = () =>
    `<aside class="rail" aria-label="创作步骤"><div class="rail-label">YOUR STORY</div>${["整理素材", "确认事实", "修改脚本"].map((name, i) => `<button class="rail-step ${state.step === i + 1 ? "current" : ""}" data-step="${i + 1}" ${i + 1 > state.step ? "disabled" : ""} ${state.step === i + 1 ? 'aria-current="step"' : ""}><span>${i + 1}</span>${name}</button>`).join("")}<small>15 秒，三段画面。<br>你来确认事实，<br>AI 帮你组织表达。</small></aside>`;
  const factLines = () =>
    [
      ["商品", state.facts.product],
      [
        "价格",
        state.facts.price ? `¥${state.facts.price}` : "未提供，脚本不提价格",
      ],
      ["已知特点", state.facts.feature || "未提供，不补充功效或口味"],
      ["这条视频", `${state.facts.goal} · ${state.facts.voice} · 15 秒`],
    ]
      .map(
        ([label, value]) =>
          `<div class="fact-line"><span>${label}</span><strong>${escape(value)}</strong></div>`,
      )
      .join("");
  function homeHTML() {
    const draft = savedDraft();
    return `<section class="intro"><div class="intro-copy"><div class="eyebrow">给一个人经营的小店</div><h1>今天的日常，<br>就是下一条<em>好内容。</em></h1><p>拍了咖啡、吧台和窗边的阳光，却不知道怎么开口？用三张素材，整理一份说得出口、拍得出来的 15 秒脚本。</p><div class="intro-actions"><button class="primary" id="sample-start">用咖啡店示例体验 <span aria-hidden="true">↗</span></button><button class="quiet" id="blank-start">用自己的照片开始 →</button></div><p class="intro-note">无需登录 · 可以修改每一句 · 不擅自编造价格和卖点</p></div><div class="scene-board" aria-label="示例：从咖啡照片到15秒拍摄脚本"><div class="board-label"><span>一杯日常 / 三个镜头</span><span>15 SEC</span></div><div class="paper-card"><img class="cover-art" src="${art(0)}" alt="原创示意图：一杯咖啡"><div class="paper-caption"><span class="time-pill">00—05s</span><strong>今天这杯，<br>想喝热的还是冰的？</strong></div></div><div class="board-row"><span>随手拍</span><span class="arrow">→</span><span>确认事实</span><span class="arrow">→</span><span>开口就能拍</span></div></div></section>${draft ? `<div class="saved-banner"><span>你有一份已保存的小笺：${escape(draft.facts.product)}</span><button id="restore">继续修改 →</button></div>` : ""}<section class="benefits" aria-label="产品重点"><div><b>照片用在哪，一眼知道</b><p>每段脚本绑定一份素材，不给你一篇拍不出来的文案。</p></div><div><b>事实由你定，表达帮你想</b><p>先确认商品和卖点，不把猜测写成承诺。</p></div><div><b>只改不满意的那一句</b><p>开头太硬？只换开头，已经喜欢的内容保留下来。</p></div></section>`;
  }
  function inputHTML() {
    return `<div class="section-top"><div><div class="step-num">STEP 1 / 3</div><h2>先看看，手上有什么。</h2><p class="muted">准备三张照片，给每张选一个用途。也可以先用示例走一遍。</p></div><button class="quiet" id="fill-sample">填入示例</button></div><div class="panel"><div class="panel-title"><h3>这次的素材</h3><span class="small-label">${state.assets.filter((a) => a.src).length} / 3 READY</span></div><div class="assets">${state.assets.map((a, i) => `<div class="asset">${a.src ? `<img src="${escape(a.src)}" alt="素材 ${i + 1}：${escape(a.role)}">` : '<div class="asset-empty" aria-hidden="true">＋</div>'}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择素材 ${i + 1}" data-upload="${i}"><select data-role="${i}" aria-label="素材 ${i + 1} 用途">${roles.map((r) => `<option ${r === a.role ? "selected" : ""}>${r}</option>`).join("")}</select><div class="asset-top"><span>${a.sample ? "示例插画" : a.src ? "本地照片" : "尚未选择"}</span>${a.src ? `<button data-remove="${i}" aria-label="移除素材 ${i + 1}">移除</button>` : ""}</div></div>`).join("")}</div>${state.fileError ? `<p class="inline-file-error" role="alert">${escape(state.fileError)}</p>` : ""}<p class="demo-note" style="margin:18px 0 0">支持 JPEG / PNG / WebP，每张最多 8MB。这里由你标记素材用途；此原型不做 AI 图像识别。</p></div><div class="panel"><div class="panel-title"><h3>这条视频想说什么？</h3><span class="small-label">YOUR BRIEF</span></div><div class="field-grid"><label class="field">商品名称 <input id="product" type="text" maxlength="30" placeholder="例如：燕麦拿铁" value="${escape(state.facts.product)}" required></label><label class="field">价格（选填，元）<input id="price" type="text" inputmode="decimal" maxlength="8" placeholder="不知道就留空，不自动编造" value="${escape(state.facts.price)}"></label><label class="field full">你确定的特点（选填）<textarea id="feature" rows="2" maxlength="80" placeholder="例如：现磨咖啡搭配燕麦奶，可做热饮或冰饮">${escape(state.facts.feature)}</textarea><small>只写你能确认的事实，不填写也可以。原型不会自动补充“低卡”“全城第一”等承诺。</small></label><label class="field">视频目的<select id="goal"><option ${state.facts.goal === "新品介绍" ? "selected" : ""}>新品介绍</option><option ${state.facts.goal === "邀请来店" ? "selected" : ""}>邀请来店</option></select></label><label class="field">说话方式<select id="voice"><option ${state.facts.voice === "像和熟客聊天" ? "selected" : ""}>像和熟客聊天</option><option ${state.facts.voice === "清爽直接" ? "selected" : ""}>清爽直接</option></select></label></div></div>${state.error ? `<div class="notice" role="alert">${escape(state.error)}</div>` : ""}<div class="bottom-actions"><small>下一步先核对事实，不会立即生成。</small><button class="primary" id="to-confirm">确认素材与事实 →</button></div>`;
  }
  function confirmHTML() {
    return `<div class="step-num">STEP 2 / 3</div><h2>这些话，确定可以说。</h2><p class="muted">脚本只使用下方内容。你未提供的信息，AI 不替你猜。</p><div class="panel"><div class="panel-title"><h3>本次创作依据</h3><button id="edit-facts" class="quiet">返回修改</button></div>${factLines()}<div class="fact-line"><span>素材用途</span><strong>${state.assets.map((a) => escape(a.role)).join(" / ")}</strong></div><div class="fact-tip"><b>不会自动补充</b><span>地址、营业时间、折扣、销量和健康功效。未提供价格时，成稿里也不出现价格。示例内容不是对真实商家的描述。</span></div><label class="check"><input id="confirmed" type="checkbox" ${state.confirmed ? "checked" : ""}><span>我已核对上面的事实；生成后会继续检查和修改，再用于发布。</span></label></div><details><summary>演示设置：查看加载和失败状态</summary><label class="demo-control"><input type="checkbox" id="fail-next" ${state.failNext ? "checked" : ""}>下一次生成模拟失败（重试会恢复正常）</label><span>生成采用本地规则与固定延时，不调用真实模型。</span></details>${state.error ? `<div class="notice" role="alert">${escape(state.error)}<br><button class="quiet" id="retry">保留输入，重新生成 →</button></div>` : ""}<div class="bottom-actions"><small>输出三段脚本与画面建议，仍由你决定是否采用。</small><button class="primary" id="generate" ${state.confirmed ? "" : "disabled"}>生成 15 秒拍摄小笺 ↗</button></div>`;
  }
  function loadingHTML() {
    return `<div class="panel loading-box" aria-busy="true"><div class="spinner" aria-hidden="true"></div><div class="eyebrow">正在整理你的创作小笺</div><h2 id="loading-title" role="status">核对你确认过的事实…</h2><p class="muted">照片不需要再传，确认过的内容也不会丢。</p><div class="loading-steps"><span class="done">核对事实</span><span id="load-middle">→ 安排三个镜头</span><span id="load-last">→ 检查口播</span></div><button id="cancel-generation" class="secondary">取消，继续修改</button><p class="demo-note" style="margin-top:22px">这是可控的模拟生成过程，不代表真实 AI 服务正在执行。</p></div>`;
  }
  function resultHTML() {
    return `<div class="section-top"><div><div class="step-num">STEP 3 / 3</div><h2>有画面，也有你想说的话。</h2><p class="muted">点文字直接改；不喜欢哪一段，就只换那一段。</p></div><button class="quiet" id="edit-facts">修改创作依据</button></div><div class="result-layout"><div><div class="script-list">${state.shots.map((s, i) => `<article class="shot"><div class="shot-header"><b>${["开头 · 留住目光", "中段 · 说清特点", "结尾 · 给出邀请"][i]}</b><span>${["00—05s", "05—10s", "10—15s"][i]}</span><span class="shot-tag">已绑定素材 ${s.assetIndex + 1}</span></div><div class="shot-body"><img class="shot-thumb" src="${escape(state.assets[s.assetIndex]?.src || art(s.assetIndex))}" alt="对应素材 ${s.assetIndex + 1}"><div class="shot-content"><label for="shot-${i}">口播 / 屏幕字幕 · 可编辑</label><textarea id="shot-${i}" data-shot="${i}" rows="2" maxlength="220">${escape(s.text)}</textarea><p class="shot-direction">画面：${escape(s.direction)}</p><div class="shot-tools"><button data-rewrite="${i}">${i === 0 ? "开头换个说法" : i === 1 ? "说得更简洁" : "邀请更自然"}</button>${state.previous[i] !== undefined ? `<button data-undo="${i}">撤回这次改写</button>` : ""}</div></div></div></article>`).join("")}</div><div class="fact-tip"><b>发布前再看一眼</b><span>AI 没有验证商家信息。15 秒为分镜节奏建议，字数长时请精简或延长拍摄；预览不含配音，也不是剪辑成片。</span></div><div class="result-toolbar"><button class="primary" id="finish">导出拍摄小笺 ↗</button><button class="secondary" id="save">保存本机草稿</button><button class="secondary" id="copy">复制口播</button></div><p class="kbd-note">照片仅在当前页面会话保留。保存后刷新可恢复文案，自己的照片需重新选择。</p></div><aside class="preview-column" aria-label="分镜预览"><div class="phone"><img id="preview-image" src="${escape(state.assets[state.shots[state.activeShot].assetIndex]?.src || art(state.activeShot))}" alt="当前分镜"><div class="phone-overlay"><span class="phone-label">STORY PREVIEW / 9:16</span><span class="phone-subtitle" id="preview-text">${escape(state.shots[state.activeShot].text)}</span><span class="phone-time" id="preview-time">${["00—05", "05—10", "10—15"][state.activeShot]} SEC · 无音轨</span></div></div><div class="preview-actions"><span id="preview-count">分镜 ${state.activeShot + 1} / 3</span><button id="play">${state.playing ? "暂停" : "▶ 播放分镜"}</button></div><p class="demo-note">用于检查画面与字幕是否匹配。插画为示例素材，不是 AI 实拍或最终视频。</p></aside></div>`;
  }
  function completeHTML() {
    return `<section class="completion"><div class="completion-mark" aria-hidden="true">✓</div><div class="eyebrow">READY TO SHOOT</div><h1>接下来，让小店出镜。</h1><p class="muted">拍摄小笺已准备好。它是拍摄和剪辑的依据，<br>最终内容仍由你来检查、拍摄和发布。</p><div class="panel"><div class="panel-title"><h3>出发前的三件小事</h3><span class="small-label">SHOOTING CHECKLIST</span></div><p>① 按小笺顺序拍三个镜头，每段多留 2 秒。<br>② 对照口播剪辑，加上字幕，再核对价格和商品。<br>③ 确认出镜者同意，使用自己有权使用的音乐与素材。</p><p class="demo-note" style="margin-bottom:0">文件为 UTF-8 文本，可交给剪辑同伴或在常用剪辑工具旁对照使用。本 Demo 不会自动发布到任何平台。</p></div><div class="completion-actions"><button class="primary" id="download">下载 .txt 小笺 ↓</button><button class="secondary" id="back-result">返回继续修改</button><button class="secondary" id="new-story">再做一条</button></div><p class="demo-note" style="margin-top:24px">如果下载未出现，可返回脚本页复制口播。草稿仅存在当前浏览器。</p></section>`;
  }
  function render() {
    homeButton.hidden = state.screen === "home";
    if (state.screen === "home") app.innerHTML = homeHTML();
    else if (state.screen === "done") app.innerHTML = completeHTML();
    else
      app.innerHTML = `<div class="workspace">${stepRail()}<section>${state.screen === "loading" ? loadingHTML() : state.step === 1 ? inputHTML() : state.step === 2 ? confirmHTML() : resultHTML()}</section></div>`;
    bind();
    const next = document.querySelector("#to-confirm");
    if (next) next.disabled = state.assets.some((a) => a.pending);
    state.assets.forEach((asset, index) => {
      if (asset.pending) {
        const label = document
          .querySelector(`[data-upload="${index}"]`)
          ?.closest(".asset")
          ?.querySelector(".asset-top span");
        if (label) label.textContent = "正在读取…";
      }
    });
  }
  function captureFacts() {
    ["product", "price", "feature", "goal", "voice"].forEach((key) => {
      const el = document.getElementById(key);
      if (el) state.facts[key] = el.value.trim();
    });
  }
  function validate() {
    if (state.assets.some((a) => a.pending))
      return "照片正在读取，请稍后再确认。";
    if (state.assets.some((a) => !a.src))
      return "请先准备三张素材，每张选择一份用途。";
    if (new Set(state.assets.map((a) => a.role)).size !== 3)
      return "请为三张素材分别选择成品特写、制作过程和店内环境，避免用途重复。";
    if (!state.facts.product) return "请填写商品名称，脚本需要知道在介绍什么。";
    if (state.facts.product.length > 30 || state.facts.feature.length > 80)
      return "商品名称或特点超出长度限制，请精简后再试。";
    if (
      state.facts.price &&
      (!/^\d{1,5}(\.\d{1,2})?$/.test(state.facts.price) ||
        Number(state.facts.price) <= 0)
    )
      return "价格请输入大于 0 的数字，最多两位小数；不想提价格可以留空。";
    return "";
  }
  function buildShots() {
    const { product, price, feature, goal, voice } = state.facts;
    const brief = voice === "清爽直接";
    const assetFor = (role) =>
      Math.max(
        0,
        state.assets.findIndex((a) => a.role === role),
      );
    return [
      {
        text: brief
          ? `今天介绍${product}。`
          : `今天这杯${product}，想不想试试看？`,
        direction: "从稍远处慢慢推近成品，留出字幕位置。",
        assetIndex: assetFor("成品特写"),
      },
      {
        text: feature
          ? `${feature}${/[。！？]$/.test(feature) ? "" : "。"}`
          : `给${product}一个近镜头，看看它完成的样子。`,
        direction: "拍下制作动作；若无制作素材，用现有画面轻推近代替。",
        assetIndex: assetFor("制作过程"),
      },
      {
        text: `${price ? `这杯${price}元。` : ""}${goal === "邀请来店" ? "路过的时候，进来坐一会儿。" : brief ? "想尝新，来店里试试。" : "下次见面，给你做一杯。"}`,
        direction: "停在店内的一个角落，用稳定画面收尾。",
        assetIndex: assetFor("店内环境"),
      },
    ];
  }
  function generate() {
    if (!state.confirmed || state.screen === "loading") return;
    const error = validate();
    if (error) {
      state.error = error;
      state.screen = "work";
      state.step = 1;
      render();
      return;
    }
    stopGeneration();
    stopPreview();
    state.screen = "loading";
    state.error = "";
    render();
    let progress = 0;
    progressTimer = setInterval(() => {
      progress++;
      const title = document.querySelector("#loading-title");
      if (title)
        title.textContent =
          progress === 1 ? "把素材安排到三个镜头…" : "把句子改得更适合开口说…";
      document
        .querySelector(progress === 1 ? "#load-middle" : "#load-last")
        ?.classList.add("done");
    }, 850);
    generationTimer = setTimeout(() => {
      stopGeneration();
      state.screen = "work";
      if (state.failNext) {
        state.failNext = false;
        state.error =
          "本次模拟生成失败，输入和已确认的事实均已保留。请重试，或返回修改。";
        state.step = 2;
      } else {
        state.shots = buildShots();
        state.previous = {};
        state.activeShot = 0;
        state.step = 3;
        state.saved = false;
      }
      render();
    }, 2700);
  }
  function updatePreview() {
    const shot = state.shots[state.activeShot];
    const img = document.querySelector("#preview-image");
    if (!img) return;
    img.src = state.assets[shot.assetIndex]?.src || art(shot.assetIndex);
    document.querySelector("#preview-text").textContent = shot.text;
    document.querySelector("#preview-time").textContent =
      `${["00—05", "05—10", "10—15"][state.activeShot]} SEC · 无音轨`;
    document.querySelector("#preview-count").textContent =
      `分镜 ${state.activeShot + 1} / 3`;
  }
  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          facts: state.facts,
          shots: state.shots,
          assets: state.assets.map((a) => ({ role: a.role, sample: a.sample })),
          savedAt: new Date().toISOString(),
        }),
      );
      state.saved = true;
      notify("草稿已保存：文案可恢复，自己的照片需重新选择。");
      return true;
    } catch {
      notify("浏览器存储不可用，草稿未保存。请导出小笺留存。");
      return false;
    }
  }
  function scriptText() {
    return `开拍小笺｜${state.facts.product}\n15 秒拍摄参考 · 本地模拟 AI，发布前请核对\n\n创作依据\n商品：${state.facts.product}\n价格：${state.facts.price ? state.facts.price + "元" : "未提供，不提价格"}\n特点：${state.facts.feature || "未提供"}\n\n${state.shots.map((s, i) => `${["00—05秒", "05—10秒", "10—15秒"][i]}｜素材${s.assetIndex + 1}：${state.assets[s.assetIndex].role}\n画面：${s.direction}\n口播：${s.text}`).join("\n\n")}\n\n注意：这是分镜脚本，不是剪辑成片。口播长时请精简或延长时长；核对事实、出镜授权及素材使用权后再发布。\n`;
  }
  function download() {
    const blob = new Blob(["\uFEFF" + scriptText()], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "开拍拍摄小笺.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("已请求下载拍摄小笺，请查看浏览器下载记录。");
  }
  function bind() {
    const click = (id, fn) =>
      document.getElementById(id)?.addEventListener("click", fn);
    click("sample-start", sample);
    click("fill-sample", sample);
    click("blank-start", () => {
      state.screen = "work";
      state.step = 1;
      render();
    });
    click("restore", () => {
      const draft = savedDraft();
      if (!draft) {
        notify("草稿无法读取，请重新开始。");
        return;
      }
      state.facts = { ...draft.facts };
      state.shots = draft.shots;
      state.assets = roles.map((role, i) => ({
        role: draft.assets?.[i]?.role || role,
        sample: !!draft.assets?.[i]?.sample,
        src: draft.assets?.[i]?.sample ? art(i) : "",
      }));
      state.screen = "work";
      state.step = 3;
      state.activeShot = 0;
      state.previous = {};
      state.confirmed = true;
      state.error = "";
      render();
      if (state.assets.some((a) => !a.src))
        notify("已恢复文案；预览用示意图替代，请在素材页重新选择自己的照片。");
    });
    click("to-confirm", () => {
      captureFacts();
      state.error = validate();
      if (!state.error) {
        state.step = 2;
        state.confirmed = false;
      }
      render();
    });
    click("edit-facts", () => {
      stopPreview();
      state.step = 1;
      state.confirmed = false;
      state.error = "";
      render();
    });
    document.querySelector("#confirmed")?.addEventListener("change", (e) => {
      state.confirmed = e.target.checked;
      document.querySelector("#generate").disabled = !state.confirmed;
    });
    document.querySelector("#fail-next")?.addEventListener("change", (e) => {
      state.failNext = e.target.checked;
    });
    click("generate", generate);
    click("retry", generate);
    click("cancel-generation", () => {
      stopGeneration();
      state.screen = "work";
      state.step = 2;
      render();
      notify("已取消，输入保留。");
    });
    document.querySelectorAll("[data-upload]").forEach((input) =>
      input.addEventListener("change", async (e) => {
        captureFacts();
        const index = Number(e.target.dataset.upload),
          file = e.target.files?.[0];
        if (!file) return;
        const uploadVersion = ++uploadVersions[index];
        state.fileError = "";
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size === 0 ||
          file.size > 8 * 1024 * 1024
        ) {
          state.fileError =
            "请选择有效的 JPEG / PNG / WebP 图片，每张不超过 8MB。";
          render();
          return;
        }
        state.assets[index].pending = true;
        render();
        const url = URL.createObjectURL(file),
          image = new Image();
        image.onload = () => {
          if (uploadVersion !== uploadVersions[index]) {
            URL.revokeObjectURL(url);
            return;
          }
          captureFacts();
          state.assets[index].pending = false;
          if (image.naturalWidth * image.naturalHeight > 24000000) {
            URL.revokeObjectURL(url);
            state.fileError = "图片超过 2400 万像素，请缩小后重试。";
            render();
            return;
          }
          if (state.assets[index].src.startsWith("blob:"))
            URL.revokeObjectURL(state.assets[index].src);
          state.assets[index] = {
            ...state.assets[index],
            src: url,
            sample: false,
          };
          state.saved = false;
          render();
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          if (uploadVersion !== uploadVersions[index]) return;
          captureFacts();
          state.assets[index].pending = false;
          state.fileError = "图片无法读取，请换一张有效照片。";
          render();
        };
        image.src = url;
      }),
    );
    document.querySelectorAll("[data-remove]").forEach((button) =>
      button.addEventListener("click", () => {
        captureFacts();
        const index = Number(button.dataset.remove);
        uploadVersions[index]++;
        const a = state.assets[index];
        if (a.src.startsWith("blob:")) URL.revokeObjectURL(a.src);
        a.src = "";
        a.sample = false;
        a.pending = false;
        render();
      }),
    );
    document.querySelectorAll("[data-role]").forEach((select) =>
      select.addEventListener("change", () => {
        state.assets[Number(select.dataset.role)].role = select.value;
        state.confirmed = false;
      }),
    );
    document.querySelectorAll("[data-step]").forEach((button) =>
      button.addEventListener("click", () => {
        if (state.screen === "loading") return;
        captureFacts();
        stopPreview();
        state.step = Number(button.dataset.step);
        state.error = "";
        render();
      }),
    );
    document.querySelectorAll("[data-shot]").forEach((text) =>
      text.addEventListener("input", () => {
        state.shots[Number(text.dataset.shot)].text = text.value;
        state.saved = false;
        updatePreview();
      }),
    );
    document.querySelectorAll("[data-rewrite]").forEach((button) =>
      button.addEventListener("click", () => {
        stopPreview();
        const i = Number(button.dataset.rewrite);
        state.previous[i] = state.shots[i].text;
        const f = state.facts;
        state.shots[i].text =
          i === 0
            ? `忙里偷闲，来一杯${f.product}吧。`
            : i === 1
              ? f.feature
                ? `${f.product}：${f.feature}${/[。！？]$/.test(f.feature) ? "" : "。"}`
                : `近一点，看看这杯${f.product}。`
              : `${f.price ? `${f.price}元一杯。` : ""}有空来坐坐，等你。`;
        state.saved = false;
        render();
        notify("只改写了这一段，其他两段保持原样。可撤回。");
      }),
    );
    document.querySelectorAll("[data-undo]").forEach((button) =>
      button.addEventListener("click", () => {
        const i = Number(button.dataset.undo);
        state.shots[i].text = state.previous[i];
        delete state.previous[i];
        render();
        notify("已恢复改写前的文案。");
      }),
    );
    click("play", () => {
      if (state.playing) {
        stopPreview();
        document.querySelector("#play").textContent = "▶ 播放分镜";
        return;
      }
      state.playing = true;
      state.activeShot = 0;
      updatePreview();
      document.querySelector("#play").textContent = "暂停";
      previewTimer = setInterval(() => {
        if (state.activeShot === 2) {
          stopPreview();
          document.querySelector("#play").textContent = "↻ 再看一遍";
          return;
        }
        state.activeShot++;
        updatePreview();
      }, 5000);
    });
    click("save", save);
    click("copy", async () => {
      try {
        await navigator.clipboard.writeText(
          state.shots.map((s) => s.text).join("\n"),
        );
        notify("三段口播已复制。");
      } catch {
        notify("浏览器不允许复制，请导出 .txt 小笺。");
      }
    });
    click("finish", () => {
      stopPreview();
      state.screen = "done";
      render();
    });
    click("download", download);
    click("back-result", () => {
      state.screen = "work";
      state.step = 3;
      render();
    });
    click("new-story", () => {
      state.screen = "work";
      state.step = 1;
      state.confirmed = false;
      render();
    });
  }
  document.querySelector(".logo").addEventListener("click", (e) => {
    e.preventDefault();
    home();
  });
  homeButton.addEventListener("click", home);
  window.addEventListener("pagehide", () => {
    stopGeneration();
    stopPreview();
    state.assets.forEach((a) => {
      if (a.src.startsWith("blob:")) URL.revokeObjectURL(a.src);
    });
  });
  render();
})();
