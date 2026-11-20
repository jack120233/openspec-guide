(() => {
  "use strict";
  const D = window.GUIDE;
  const $ = (s, root = document) => root.querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon = name => `<i data-lucide="${esc(name)}"></i>`;
  const navs = [
    ["roadmap","学习路线","route","01"],
    ["features","功能全景","layout-grid","02"],
    ["lab","工作流实验室","flask-conical","03"],
    ["commands","命令速查","square-terminal","04"],
    ["specs","规范与验收","file-check-2","05"],
    ["practices","团队与进阶","network","06"],
    ["sources","资料与版本","library","07"]
  ];
  const storageKey = "openspec-fieldguide-v2";
  let saved = {};
  let storageAvailable = true;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; }
  catch { storageAvailable = false; }
  const state = {
    completed: Array.isArray(saved.completed) ? saved.completed.filter(id => D.stages.some(s => s.id === id)) : [],
    stars: Array.isArray(saved.stars) ? saved.stars.filter(id => [...D.skills,...D.capabilities].some(s => s.id === id)) : [],
    notes: typeof saved.notes === "string" ? saved.notes : "",
    tool: ["codex","claude","cursor"].includes(saved.tool) ? saved.tool : "codex",
    route: "roadmap", overviewStep: 1, labStep: 0, labFile: "",
    featureCategory: "all", hotOnly: false, starsOnly: false,
    commandGroup: "全部", commandType: "全部", commandQuery: "",
    configTab: "project", quizAnswers: {}, quizSubmitted: false,
    editorText: D.examples.spec, editorReport: null
  };
  const main = $("#main");
  let toastTimer;
  let modalItem = null;

  function hydrate() {
    if (window.lucide) window.lucide.createIcons({attrs: {"aria-hidden": "true"}});
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({completed:state.completed, stars:state.stars, notes:state.notes, tool:state.tool}));
    } catch {
      storageAvailable = false;
      toast("当前浏览器无法保存记录；可使用导出。");
    }
  }
  function toast(text) {
    clearTimeout(toastTimer);
    const el = $("#toast");
    el.textContent = text;
    el.classList.add("visible");
    toastTimer = setTimeout(() => el.classList.remove("visible"), 2800);
  }
  function refs(ids) {
    return `<div class="source-refs"><span>依据</span>${ids.map(id => {
      const src = D.sources.find(s => s.id === id);
      return `<a href="${src.url}" target="_blank" rel="noopener noreferrer" title="${esc(src.title)}">${id} ${icon("arrow-up-right")}</a>`;
    }).join("")}</div>`;
  }
  function pill(text, kind = "") { return `<span class="pill ${kind}">${esc(text)}</span>`; }
  function codeBlock(code, label = "TERMINAL") {
    return `<div class="code-block"><header><span>${esc(label)}</span><button class="icon-button" data-action="copy" data-copy="${esc(code)}" aria-label="复制代码" title="复制">${icon("copy")}</button></header><pre>${esc(code)}</pre></div>`;
  }
  function heading(index, title, description, action = "", stats = "") {
    return `<div class="page-heading"><div><div class="eyebrow">FIELD NOTES / ${index}</div><h1>${title}</h1><p>${description}</p>${stats}</div>${action}</div>`;
  }
  function toolTabs() {
    return `<div class="segment" role="group" aria-label="AI 工具">${[["codex","Codex"],["claude","Claude Code"],["cursor","Cursor"]].map(([id,label])=>`<button data-action="tool" data-id="${id}" class="${state.tool===id?"active":""}" aria-pressed="${state.tool===id}">${label}</button>`).join("")}</div>`;
  }
  function skillCommand(command) {
    return command.replace(/@([\w-]+)/g, (_, id) => {
      const skill = D.skills.find(s => s.id === id);
      return skill ? `${state.tool === "codex" ? "$" : "/"}${skill.name}` : `@${id}`;
    });
  }
  function updateProgress() {
    $("#side-progress").textContent = `${state.completed.length} / 6`;
    $("#progress-fill").style.width = `${state.completed.length / 6 * 100}%`;
    $("#progress-caption").textContent = state.completed.length === 6 ? "已完成路线，去实践一个真实变更" : state.completed.length ? "按自己的节奏，继续向前" : "从第一个小变更开始";
  }
  function currentNextStage() { return D.stages.find(s => !state.completed.includes(s.id)) || D.stages[0]; }
  function renderNav() {
    $("#nav").innerHTML = navs.map(([id,title,ic,n]) => `<a class="nav-link ${state.route===id?"active":""}" href="#${id}" ${state.route===id?'aria-current="page"':""}>${icon(ic)}<span>${title}</span><small class="nav-number">${n}</small></a>`).join("");
    $("#breadcrumb-current").textContent = navs.find(n => n[0] === state.route)[1];
    updateProgress();
  }
  function renderRoadmap() {
    const quick = D.flow.filter(f => f.id !== "verify");
    const selected = quick[state.overviewStep];
    main.innerHTML = heading("01", "OpenSpec 学习路线", "先对齐「要做什么」，再让 AI 实施。用一个小变更，学会规范驱动开发的完整闭环。",
      `<button class="button primary" data-action="lesson" data-id="${currentNextStage().id}">${icon("play")} ${state.completed.length ? "继续学习" : "开始学习"} ${icon("arrow-right")}</button>`,
      `<div class="stats-line"><span><strong>12</strong> 个工作流</span><span><strong>6</strong> 个学习阶段</span><span><strong>v2.1</strong> 当前教程版本</span></div>`) +
      `<section class="quick-loop" aria-label="核心工作流">
        <div class="loop-topline"><strong>一条主线，先建立全局认识</strong><span>THE CORE LOOP</span></div>
        <div class="loop-nodes">${quick.map((f,i)=>`<button class="loop-node ${i===state.overviewStep?"active":""}" data-action="overview-step" data-index="${i}" aria-pressed="${i===state.overviewStep}"><span class="node-icon">${icon(f.icon)}</span><span><strong>${f.label}</strong><small>${f.en}</small></span></button>`).join("")}</div>
        <div class="loop-detail"><p><strong>${String(state.overviewStep+1).padStart(2,"0")} / ${selected.title}</strong>${esc(selected.desc)}</p><a class="text-link" href="#lab/${selected.id}">到实验室看看 ${icon("arrow-up-right")}</a></div>
      </section>
      <div class="route-layout">
        <section>
          <div class="section-label"><div><h2>从这里开始</h2><small>约 1 小时掌握主线</small></div><span class="result-count">LEARNING PATH</span></div>
          <p class="route-intro">前四节打通日常开发，后两节按项目需要扩展。</p>
          <div class="route-list">${D.stages.map((s,i)=>`<div class="route-item ${state.completed.includes(s.id)?"done":""}">
            <span class="step-num">${state.completed.includes(s.id)?icon("check"):String(i+1).padStart(2,"0")}</span>
            <button class="route-open" data-action="lesson" data-id="${s.id}"><span class="route-name"><strong>${s.title}</strong>${pill(s.tag,s.tag==="高频重点"?"hot":i<2?"green":"")}</span><span>${s.subtitle}<span class="time">${s.time}</span></span></button>
            <input class="route-check" type="checkbox" data-stage="${s.id}" ${state.completed.includes(s.id)?"checked":""} aria-label="标记${s.title}已掌握" title="标记已掌握">
          </div>`).join("")}</div>
        </section>
        <aside class="focus-aside">
          <h3 class="focus-title">${icon("asterisk")} 三件事，特别注意</h3>
          <div class="focus-note"><span class="note-index">01 /</span><h4>提案不是实现</h4><p>Propose 只生成规划。审阅范围和场景后，才进入 Apply。</p></div>
          <div class="focus-note"><span class="note-index">02 /</span><h4>校验不是测试</h4><p>Validate 检查结构；Verify 对照计划。真实测试仍需单独运行。</p></div>
          <div class="focus-note"><span class="note-index">03 /</span><h4>归档不是提交</h4><p>Archive 同步规范并整理变更，不替你提交 Git、合并 PR 或上线。</p></div>
          <div class="version-note"><h4>旧教程里的 /opsx:* 呢？</h4><p>2.0 已切换为 Skills，2.1 增加全局安装。Codex 使用 $openspec-*。</p><a class="text-link" href="#sources/migration">看版本对照 ${icon("arrow-up-right")}</a></div>
        </aside>
      </div>
      <div class="milestone"><div><strong>第一个目标：完成一个小变更</strong><p>不必先背完所有命令。先试一遍「深色模式」的完整过程。</p></div><a class="button" href="#lab">${icon("flask-conical")} 进入实验室</a></div>
      <section class="learning-note"><div class="section-label"><h2>我的学习笔记</h2><small id="note-status">${storageAvailable?"仅保存在当前浏览器":"无法本地保存，请导出记录"}</small></div><textarea id="learning-notes" aria-label="我的学习笔记" placeholder="记下你的项目里，哪一个小需求适合成为第一个变更…">${esc(state.notes)}</textarea></section>`;
  }
  function filteredFeatures() {
    const list = [
      ...D.skills.map(s => ({...s, type:"skill", title:s.label, category:s.group==="core"?"核心 Skills":"可选 Skills",level:s.hot?"高频重点":s.group==="core"?"默认":"可选"})),
      ...D.capabilities.map(c=>({...c,type:"capability",hot:c.level==="高频重点"||c.level==="新版重点"}))
    ];
    return list.filter(f => (state.featureCategory==="all"||f.category===state.featureCategory) && (!state.hotOnly || f.hot) && (!state.starsOnly || state.stars.includes(f.id)));
  }
  function renderFeatures() {
    const cats = ["核心 Skills","可选 Skills","规范与产物","管理与校验","配置与扩展","接入与协作"];
    const list = filteredFeatures();
    main.innerHTML = heading("02","功能全景","核心工作流、终端工具与扩展能力分开看。先掌握高频路径，再按项目规模增加复杂度。") +
      `<div class="toolbar"><div class="filter-group"><select id="feature-category" class="filter-select" aria-label="功能分类"><option value="all">全部分类</option>${cats.map(c=>`<option ${state.featureCategory===c?"selected":""}>${c}</option>`).join("")}</select><label class="check-label"><input id="hot-filter" type="checkbox" ${state.hotOnly?"checked":""}>只看重点</label><label class="check-label"><input id="stars-filter" type="checkbox" ${state.starsOnly?"checked":""}>我的关注 <span>(${state.stars.length})</span></label></div><span class="result-count">${list.length} / ${D.skills.length+D.capabilities.length} 项能力</span></div>
      ${list.length ? cats.map(cat=>{
        const items = list.filter(f=>f.category===cat);
        if (!items.length) return "";
        return `<section class="feature-section"><header><h2>${cat}</h2><span>${String(items.length).padStart(2,"0")}</span>${cat==="核心 Skills"?pill("默认安装","green"):cat==="可选 Skills"?pill("需在 Profile 中启用"):""}</header><div class="feature-grid">${items.map(f=>`<article class="feature-card">
          <div class="feature-card-head"><span class="feature-icon">${icon(f.icon)}</span>${pill(f.level,f.hot?"hot":f.level==="Beta"?"blue":"")}</div>
          <h3>${esc(f.title)}</h3>${f.name?`<code>${f.name}</code>`:""}<p>${esc(f.desc)}</p>
          <div class="feature-card-bottom"><button class="text-link" data-action="feature" data-id="${f.id}" data-type="${f.type}">查看详解 ${icon("arrow-up-right")}</button><button class="icon-button star-button ${state.stars.includes(f.id)?"selected":""}" data-action="star" data-id="${f.id}" title="${state.stars.includes(f.id)?"取消关注":"加入关注"}" aria-label="${state.stars.includes(f.id)?"取消关注":"关注"}${esc(f.title)}" aria-pressed="${state.stars.includes(f.id)}">${icon("bookmark")}</button></div>
        </article>`).join("")}</div></section>`;
      }).join("") : `<div class="empty-state">${icon("bookmark")}<h3>还没有符合条件的能力</h3><p>可以取消筛选，或在功能列表中加入关注。</p><button class="button" data-action="reset-filters">${icon("list-filter")} 清除筛选</button></div>`}
      <section class="boundary-strip"><div><h3>${icon("check")} 它负责什么</h3><p>规范与变更的文件结构、工作流指令、格式校验，以及可追溯的规划上下文。</p></div><div><h3>${icon("user-round")} 你仍然负责什么</h3><p>确认需求、审阅风险、运行真实测试、管理 Git、部署与最终验收。</p></div><div><h3>${icon("puzzle")} 哪些属于外部扩展</h3><p>第三方 Web 工作台、测试映射插件和托管审阅服务，不是核心内置能力。</p></div></section>${refs(["S03","S04","S19"])}`;
  }
  function renderLab() {
    const f = D.flow[state.labStep];
    if (!f.files.includes(state.labFile)) state.labFile = f.files[0] || "";
    main.innerHTML = heading("03","工作流实验室","同一个需求，不同阶段。跟随文件变化，理解什么时间规划、什么时间写代码、什么时间更新规范。") +
      `<div class="lab-case"><div>${icon("moon")}<strong>案例 / 添加深色模式</strong><code>add-dark-mode</code></div><small>预设教学演示 · 不调用 AI，不执行命令</small></div>
      <div class="lab-steps" aria-label="工作流阶段">${D.flow.map((s,i)=>`<button class="lab-step ${i===state.labStep?"active":""}" data-action="lab-step" data-index="${i}" aria-pressed="${i===state.labStep}"><span class="step-circle">${String(i+1).padStart(2,"0")}</span><span><strong>${s.label}</strong><small>${s.en}</small></span></button>`).join("")}</div>
      <div class="lab-summary"><div><h2>${f.title}</h2><p>${esc(f.desc)}</p></div>${pill(f.id==="verify"?"可选 Skill":f.id==="review"?"人为审阅步骤":"核心路径",f.id==="verify"?"blue":"green")}</div>
      <div class="lab-workbench"><aside class="file-tree"><div class="tree-title">${icon("folder-tree")} PROJECT FILES</div><div class="tree-root">${icon("chevron-down")}${icon("folder-open")} openspec /</div>${f.files.length?f.files.map(file=>`<button data-action="lab-file" data-file="${file}" class="${file===state.labFile?"active":""}">${icon(file.endsWith("/")?"folder-archive":"file-text")}<span>${esc(file)}</span></button>`).join(""):`<p class="tree-empty">暂无新增文件<br>探索先发生在对话里。</p>`}</aside><div class="code-pane" id="lab-code">${labCode()}</div></div>
      <div class="lab-command">${icon("terminal")}<div><small>${state.tool==="codex"?"CODEX":"CLAUDE / CURSOR"} · AI 对话</small><code>${esc(skillCommand(f.command))}</code></div><button class="icon-button" data-action="copy" data-copy="${esc(skillCommand(f.command))}" aria-label="复制本阶段命令" title="复制">${icon("copy")}</button></div>
      <div class="lab-bottom"><div class="focus-callout"><strong>${icon("asterisk")} 这一阶段的关注重点</strong><p>${esc(f.focus)}</p></div><div class="lab-review"><h3>需要确认</h3><ul>${f.review.map(r=>`<li>${icon("check")}<span>${esc(r)}</span></li>`).join("")}</ul></div></div>
      <div class="lab-controls"><div><button class="icon-button" data-action="lab-reset" aria-label="重新开始演示" title="重新开始">${icon("rotate-ccw")}</button><button class="button" data-action="lab-prev" ${state.labStep===0?"disabled":""}>${icon("arrow-left")} 上一步</button><button class="button primary" data-action="lab-next" ${state.labStep===5?"disabled":""}>下一步 ${icon("arrow-right")}</button></div><span>${String(state.labStep+1).padStart(2,"0")} / 06</span></div>
      ${refs(["S02","S03","S05"])}`;
  }
  function labFileContent() {
    const file = state.labFile;
    if (!file) return "";
    if (file.includes("archive/")) return "2026-11-17-add-dark-mode/\n  .openspec.yaml\n  proposal.md\n  specs/theme/spec.md\n  design.md\n  tasks.md\n\n变更已移入归档。\n主规范已独立更新。\nGit 提交、PR 合并与部署尚需你处理。";
    if (file === "specs/theme/spec.md" && state.labStep===5) return D.examples.mainSpec;
    if (file.includes("proposal")) return D.examples.proposal;
    if (file.includes("spec.md")) return D.examples.spec;
    if (file.includes("design")) return D.examples.design;
    if (file.includes("tasks")) return state.labStep>=4 ? D.examples.tasksDone : D.examples.tasks;
    if (file.startsWith("tests")) return D.examples.test;
    return D.examples.code;
  }
  function labCode() {
    if (!state.labFile) return `<div class="lab-empty"><div class="empty-symbol">${icon("messages-square")}</div><h3>从三个问题开始</h3><ul><li>谁需要这个能力？</li><li>什么可观察结果算“完成”？</li><li>哪些事情明确不在本次范围内？</li></ul></div>`;
    const text = labFileContent();
    return `<div class="code-toolbar"><span>${esc(state.labFile)}</span><button class="icon-button" data-action="copy" data-copy="${esc(text)}" aria-label="复制当前文件示例" title="复制示例">${icon("copy")}</button></div><div class="code-scroll">${text.split("\n").map(line=>`<span class="code-line ${line.startsWith("#")?"heading":line.startsWith("//")?"comment":""}">${esc(line)||" "}</span>`).join("")}</div>`;
  }
  function commandMatches(c) {
    const q = state.commandQuery.toLowerCase().trim();
    return (state.commandGroup==="全部"||c[0]===state.commandGroup) && (state.commandType==="全部"||c[1]===state.commandType) && (!q||[c[2],skillCommand(c[3]),c[4]].join(" ").toLowerCase().includes(q));
  }
  function commandRows() {
    const rows = D.commands.filter(commandMatches);
    return rows.length ? `<table class="command-table"><thead><tr><th>用途 / 输入位置</th><th>命令</th><th>特别注意</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${c[2]}<small>${c[0]} · ${c[1]}</small></td><td><div class="command-cell"><code>${esc(skillCommand(c[3]))}</code><button class="icon-button" data-action="copy" data-copy="${esc(skillCommand(c[3]))}" title="复制" aria-label="复制${c[2]}命令">${icon("copy")}</button></div></td><td>${esc(c[4])} <a href="${D.sources.find(s=>s.id===c[5]).url}" target="_blank" rel="noopener noreferrer" title="查看命令来源">[${c[5]}]</a></td></tr>`).join("")}</tbody></table>` : `<div class="empty-state">${icon("search-x")}<h3>没有匹配的命令</h3><p>换个关键词，或调整分组与输入位置。</p></div>`;
  }
  function renderCommands() {
    const groups = [...new Set(D.commands.map(c=>c[0]))];
    main.innerHTML = heading("04","命令速查","终端命令交给 CLI，工作流技能交给 AI 助手。先分清输入位置，再复制对应命令。") +
      `<div class="toolbar command-tools">${toolTabs()}<div class="command-search">${icon("search")}<input id="command-search" type="search" aria-label="查找命令" placeholder="查找命令…" value="${esc(state.commandQuery)}"></div></div>
      <div class="command-context">${icon("info")}<span>${state.tool==="codex"?"Codex 对话使用 <code>$openspec-*</code>；桌面也可从 Skills 选择。":"此工具对话使用 <code>/openspec-*</code>；技能发现与菜单取决于助手版本。"} 所有 <code>openspec …</code> 输入到终端。尖括号内容是待替换占位符。</span></div>
      <div class="toolbar"><div class="filter-group"><select id="command-group" class="filter-select" aria-label="命令分组"><option>全部</option>${groups.map(g=>`<option ${state.commandGroup===g?"selected":""}>${g}</option>`).join("")}</select><select id="command-type" class="filter-select" aria-label="输入位置"><option>全部</option>${["终端","AI 对话"].map(t=>`<option ${state.commandType===t?"selected":""}>${t}</option>`).join("")}</select></div><span class="result-count" id="command-count">${D.commands.filter(commandMatches).length} 条命令</span></div>
      <div id="command-rows">${commandRows()}</div><p class="command-note">可选 Skills 需要先在 openspec config profile 中勾选，再运行 openspec update。不同命令的参数并不通用，遇到差异请运行对应 --help。</p>${refs(["S03","S04","S08","S13"])}`;
  }
  function renderSpecs() {
    main.innerHTML = heading("05","规范与验收","好的规范是可观察的行为约定。让实现可以改变，让期望的结果保持清楚。") +
      `<div class="article-layout"><article>
      <section class="article-section" id="spec-format"><h2>把“做好一点”写成可验收的结果</h2><p>需求标题、规范性描述、至少一个场景组成一个需求块。结构标记保留官方英文写法；正文可以使用中文。</p>
        <div class="compare-grid"><div class="compare-column bad"><h3>${pill("不够具体","hot")}</h3><p>“支持深色模式，体验要好。”</p><pre>问题：什么时间启用？\n谁的偏好优先？\n保存失败怎么办？</pre></div><div class="compare-column"><h3>${pill("可以验收","green")}</h3><p>“无已保存偏好时使用系统主题；显式选择优先。”</p><pre>WHEN 无本机选择且系统是深色\nTHEN 首次渲染使用深色主题</pre></div></div>${refs(["S05"])}
      </section>
      <section class="article-section" id="spec-delta"><h2>差量写法：最值得牢记的四件事</h2><div class="prose-list">
        <div><span class="prose-num">01</span><div><h3>层级是契约的一部分</h3><p>使用 <code>## ADDED Requirements</code>、<code>### Requirement:</code>、<code>#### Scenario:</code>。每个需求至少一个场景，场景写触发条件与预期结果。</p></div></div>
        <div><span class="prose-num">02</span><div><h3>MODIFIED 必须带完整块</h3><p>复制主规范中原有需求和全部场景，再修改。它不是只应用几行文本的补丁，漏掉旧场景可能在同步时丢失约定。</p></div></div>
        <div><span class="prose-num">03</span><div><h3>新增与删除明确表达意图</h3><p>新增用 ADDED；删除用 REMOVED，并交代 Reason 与 Migration；只改名用 RENAMED。新能力可写 Purpose，避免归档后留下待填的主规范说明。</p></div></div>
        <div><span class="prose-num">04</span><div><h3>行为与实现分开</h3><p>规范讲输入、输出、错误与外部约束。实现库、类名和技术取舍写在 design；逐项操作与验证方式写在 tasks。</p></div></div>
      </div>${refs(["S05"])}</section>
      <section class="article-section" id="spec-editor"><div class="section-label"><h2>格式练习</h2>${pill("教学级检查","blue")}</div><p>下面是一份新增能力的示例。编辑后可以检查标题层级、需求与场景的基本结构。</p>
        <label for="spec-editor-input" class="result-count">specs/theme/spec.md</label><textarea class="spec-editor" id="spec-editor-input" spellcheck="false" aria-label="规范练习编辑器">${esc(state.editorText)}</textarea>
        <div class="editor-tools"><div><button class="button primary" data-action="lint">${icon("scan-line")} 检查格式</button><button class="button" data-action="editor-reset">${icon("rotate-ccw")} 恢复示例</button></div><button class="text-link" data-action="copy-editor">${icon("copy")} 复制示例</button></div>
        <div class="editor-report" id="editor-report" role="status" aria-live="polite">${state.editorReport||""}</div><p class="editor-disclaimer">这不是官方解析器：不处理完整的 Markdown、已有规范语义、所有 Delta 操作或归档合并。真实项目请运行 <code>openspec validate &lt;change&gt; --strict</code>。</p>
      </section>
      <section class="article-section" id="spec-acceptance"><h2>验收用三道检查，不押在一个命令上</h2><div class="prose-list">
        <div><span class="prose-num">01</span><div><h3>结构检查 / Validate</h3><p>官方 CLI 检查规范、差量和结构问题。建议把严格校验放入 CI；它不会运行项目测试。</p></div></div>
        <div><span class="prose-num">02</span><div><h3>计划对照 / Verify（可选）</h3><p>AI 对照需求、任务、设计与代码给出检查报告；不改文件，不自动修复，也不代表测试实际通过。</p></div></div>
        <div><span class="prose-num">03</span><div><h3>真实证据 / 项目测试与人工审阅</h3><p>执行你的单元、集成、端到端测试，检查 diff、安全和边界行为。测试命令取决于项目，不由 OpenSpec 自动决定。</p></div></div>
      </div>${codeBlock("openspec validate add-dark-mode --strict\n# 然后运行项目自身的测试命令，例如：\nnpm test")}<div class="focus-callout"><strong>${icon("asterisk")} 任务的勾选要有依据</strong><p>任务应自带验证方式；每个实现组及时完成对应测试与文档。不要把所有测试都拖到最后一个阶段。</p></div>${refs(["S03","S04","S05"])}</section>
      <section id="quiz"><div class="section-label"><h2>检查你的理解</h2><small>5 道小题</small></div><div class="quiz">${D.quiz.map((q,i)=>`<div class="quiz-question"><h3><span>${String(i+1).padStart(2,"0")}</span>${esc(q.q)}</h3><div class="quiz-options">${q.options.map((o,j)=>`<label><input type="radio" name="quiz-${i}" value="${j}" data-quiz="${i}" ${state.quizAnswers[i]===j?"checked":""}>${esc(o)}</label>`).join("")}</div><div class="quiz-feedback" id="quiz-feedback-${i}">${quizFeedback(i)}</div></div>`).join("")}</div><div class="quiz-actions"><button class="button primary" data-action="quiz-submit">${icon("circle-check")} 检查答案</button><button class="icon-button" data-action="quiz-reset" title="重做测验" aria-label="重做测验">${icon("rotate-ccw")}</button><span class="quiz-score" id="quiz-score">${quizScore()}</span></div></section>
      </article><aside class="article-aside"><h3>本节目录</h3><a href="#specs/spec-format">可验收的结果</a><a href="#specs/spec-delta">四种差量操作</a><a href="#specs/spec-editor">格式练习</a><a href="#specs/spec-acceptance">三道验收检查</a><a href="#specs/quiz">理解自测</a><div class="aside-tip"><h3>${icon("asterisk")} 高频坑</h3><p>Scenario 是四级标题。<br>MODIFIED 保留完整需求。<br>Validate 不等于测试。<br>Archive 不等于上线。</p></div></aside></div>`;
  }
  function quizFeedback(i) {
    if (!state.quizSubmitted) return "";
    const answered = state.quizAnswers[i];
    return `<span class="${answered===D.quiz[i].answer?"report-success":"report-error"}">${answered===undefined?"尚未作答":answered===D.quiz[i].answer?"回答正确":"再想一想"}</span> ${esc(D.quiz[i].why)}`;
  }
  function quizScore() {
    if (!state.quizSubmitted) return "";
    return `${D.quiz.filter((q,i)=>state.quizAnswers[i]===q.answer).length} / 5 正确`;
  }
  function configContent() {
    const configs = {
      project: {desc:"给单仓库一个简洁的团队约定。规则是给 AI 的指导，不是强制执行的程序钩子。",code:D.capabilities.find(c=>c.id==="config").code,refs:["S09","S17"]},
      stores: {desc:"Beta：store 指向写入目标的后备根目录，references 只声明只读参考。若已存在本地 specs/ 或 changes/，本地根目录仍优先于 store 字段。",code:"# 仅配置型 openspec/ 目录，无本地 specs/changes/\nstore: team-plans\nreferences:\n  - platform-specs\n  - id: design-system\n    remote: git@github.com:acme/design-system.git\n\n# 每台机器需先 clone 并 register 这些 Store",refs:["S11","S17"]},
      schema: {desc:"Schema 命令仍属实验性。fork 后校验，再由你修改 config.yaml；旧 change 会保留创建时的 Schema 选择。",code:"openspec schema fork spec-driven team-flow\nopenspec schema validate team-flow\nopenspec schema which team-flow\n\n# openspec/config.yaml\nschema: team-flow\n\n# fork 是快照，不会随 openspec update 自动升级",refs:["S10"]}
    };
    const c = configs[state.configTab];
    return `<p class="config-description">${c.desc}</p>${codeBlock(c.code,state.configTab==="project"?"openspec/config.yaml":"EXAMPLE")}${refs(c.refs)}`;
  }
  function renderPractices() {
    main.innerHTML = heading("06","团队与进阶","把工作流带进真实代码库。先稳住单仓库的交付节奏，再考虑多仓库规划与社区扩展。") +
      `<section class="practice-grid">${D.practices.map(p=>`<article class="practice-item"><header>${icon(p.icon)}<h3>${p.title}</h3>${pill(p.kind,p.kind==="社区实践"?"blue":p.kind==="教程建议"?"":"green")}</header><p>${p.body}</p>${refs(p.refs)}</article>`).join("")}</section>
      <section class="config-demo"><div class="section-label"><h2>配置参考</h2><small>按实际项目调整</small></div><div class="config-tabs" role="group" aria-label="配置示例">${[["project","单仓库团队"],["stores","多仓库规划"],["schema","定制 Schema"]].map(([id,label])=>`<button data-action="config-tab" data-id="${id}" class="${state.configTab===id?"active":""}" aria-pressed="${state.configTab===id}">${label}</button>`).join("")}</div><div id="config-content">${configContent()}</div></section>
      <section class="article-section" style="margin-top:30px"><h2>多仓库：先确认“写到哪里”</h2><div class="prose-list">${[
        ["--store &lt;id&gt;","显式参数最高优先级，适合明确指定规划仓库的操作。"],
        ["本地 specs/ 或 changes/","项目已有本地规划目录时，优先继续使用本地目录。"],
        ["config.yaml 中的 store","只有 config 的项目可以把 store 作为规划入口。"],
        ["机器级 defaultStore","前面都不匹配时的后备选项，不要在不确定时随意设置。"]
      ].map(([t,p],i)=>`<div><span class="prose-num">0${i+1}</span><div><h3>${t}</h3><p>${p}</p></div></div>`).join("")}</div><div class="focus-callout" style="margin-top:23px"><strong>${icon("asterisk")} 同一工作区，不等于同步和权限</strong><p>Workset 只是文件夹组合。请另行管理 Git 同步、仓库权限和 AI 助手的访问边界。目前不要用 --tool codex 或 --tool claude 作为 Workset opener。</p></div>${refs(["S11","S12"])}</section>
      <section class="official-preview"><figure><img src="assets/openspec-dashboard.png" alt="官方 README 中的 OpenSpec 终端仪表盘截图，显示规范数量、活跃变更与任务进度" loading="lazy" width="1615" height="1487"><figcaption>官方 README 截图 · 历史示意，非本文实时项目数据 · OpenSpec / MIT</figcaption></figure><div><div class="eyebrow">OFFICIAL CLI</div><h3>管理视图，先从终端开始</h3><p><code>openspec view</code> 已能提供汇总概览。第三方可视化工作台属于外部扩展，是否引入应取决于你的实际协作需求。</p><a class="text-link" href="#features/cli">了解管理与查询 ${icon("arrow-up-right")}</a>${refs(["S01","S04","S21"])}</div></section>`;
  }
  function renderSources() {
    main.innerHTML = heading("07","资料与版本","先看官方的能力契约，再看真实实践。所有外部扩展都与核心功能分开标注。") +
      `<section class="source-banner"><strong>核对基准：OpenSpec v2.1.0 / 2026 年 11 月 17 日</strong><p>本教程根据官方发布标签中的文档与源码整理，npm 发布版本也已核对。在线文档会继续变化；每个官方条目都附有固定版本入口。学习时以你实际安装版本的帮助与升级指南为准。</p></section>
      <section class="article-section" id="migration"><h2>旧命令对照：别被过时教程绊住</h2><p>2.0 移除生成式 /opsx:* 命令文件，改为统一 Skills。Codex 与大多数其他助手的调用符号不同。下表的技能调用都在 AI 对话中，不在终端。</p>
      <table class="migration"><thead><tr><th>1.x 旧命令</th><th>2.x / Codex</th><th>多数其他助手</th></tr></thead><tbody>${D.skills.map(s=>`<tr><td><code>/opsx:${s.id}</code></td><td><code>$${s.name}</code></td><td><code>/${s.name}</code></td></tr>`).join("")}</tbody></table>
      <div class="focus-callout"><strong>${icon("asterisk")} v2.1 的新增迁移重点</strong><p>新项目默认全局安装 Skills；需要提交技能进仓库时显式用 --scope project。现有项目更新时会询问是否迁移。更新会整体覆盖内置技能目录，先备份修改并执行 update --dry-run。</p></div>${refs(["S14","S15","S16"])}</section>
      <div class="section-label"><h2>来源索引</h2><small>${D.sources.length} 项一手资料</small></div>
      <section class="sources-list">${D.sources.map(s=>`<article class="source-item"><header><span class="source-id">${s.id}</span><a href="${s.url}" target="_blank" rel="noopener noreferrer"><h3>${s.title}</h3></a>${pill(s.type,s.type.startsWith("社区")?"blue":"")}</header><p>${s.desc}</p><div class="source-links"><a href="${s.url}" target="_blank" rel="noopener noreferrer">阅读原文 ${icon("arrow-up-right")}</a>${s.path?`<a href="https://github.com/Fission-AI/OpenSpec/blob/v2.1.0/docs-lab/${s.path}" target="_blank" rel="noopener noreferrer">v2.1.0 固定版 ${icon("git-commit-horizontal")}</a>`:""}</div></article>`).join("")}</section>
      <section class="article-section" style="margin-top:30px"><h2>阅读与数据说明</h2><p>本页是独立整理的中文学习材料，不是 OpenSpec 官方教程。规划示例、路线时长、重点优先级、PR 建议与练习题由教程作者编排，不是官方强制流程。社区案例依据项目作者的文档，未在此环境安装或实测第三方服务；请自行核对兼容性、权限与数据政策。</p><p>页面不包含统计、AI 请求或远端存储。进度、关注、笔记与工具偏好只尝试保存在当前浏览器；清除浏览器数据或换浏览器后不会自动同步，可用顶部导出按钮保留记录。复制按钮只写入剪贴板，不执行命令。</p><p>官方仪表盘图片来自 v2.1.0 仓库 assets，遵循随附 MIT 许可。图标使用 Lucide（ISC 许可），已保留发行文件中的许可声明。</p></section>
      <div class="reset-area"><div><strong>学习记录</strong><p>重置仅清除本教程在当前浏览器中的进度、关注、笔记与工具偏好。</p></div><button class="button" data-action="confirm-reset">${icon("rotate-ccw")} 重置记录</button></div>`;
  }
  function render() {
    renderNav();
    const views = {roadmap:renderRoadmap, features:renderFeatures, lab:renderLab, commands:renderCommands, specs:renderSpecs, practices:renderPractices, sources:renderSources};
    views[state.route]();
    hydrate();
    document.title = `OpenSpec · ${navs.find(n=>n[0]===state.route)[1]} | 学习手册`;
  }
  function openLesson(id) {
    const s = D.stages.find(x=>x.id===id);
    if (!s) return;
    modalItem = {type:"lesson",id};
    $("#detail-content").innerHTML = `<div class="dialog-heading"><div><div class="eyebrow">LEARNING PATH / ${String(D.stages.indexOf(s)+1).padStart(2,"0")}</div><h2 id="detail-title">${s.title}</h2><code>${s.time} · ${s.tag}</code></div><button class="icon-button" data-action="close-detail" aria-label="关闭详情" title="关闭">${icon("x")}</button></div><div class="dialog-body"><p>${esc(s.intro)}</p><div class="prose-list">${s.points.map(([title,text],i)=>`<div><span class="prose-num">0${i+1}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`).join("")}</div>${s.code?codeBlock(s.code,s.id==="concept"?"目录示意":s.id==="setup"||s.id==="custom"||s.id==="team"?"TERMINAL":"输入位置见注释"):""}<div class="focus-callout"><strong>${icon("asterisk")} 关注重点</strong><p>${esc(s.focus)}</p></div><p class="exercise"><strong>本节实践：</strong>${esc(s.exercise)}</p>${refs(s.refs)}</div><div class="dialog-footer"><label class="check-label"><input type="checkbox" data-stage="${s.id}" ${state.completed.includes(s.id)?"checked":""}>我已掌握这一节</label><button class="button primary" data-action="${s.next?"next-lesson":"finish-lesson"}" data-id="${s.next||s.id}">${s.next?"掌握并进入下一节":"标记本节完成"} ${icon("arrow-right")}</button></div>`;
    showDetail();
  }
  function openFeature(id, type) {
    const item = type==="skill"?D.skills.find(s=>s.id===id):D.capabilities.find(s=>s.id===id);
    if (!item) return;
    modalItem = {type,id};
    const isSkill = type==="skill";
    $("#detail-content").innerHTML = `<div class="dialog-heading"><div><div class="eyebrow">${isSkill?(item.group==="core"?"CORE SKILL":"OPTIONAL SKILL"):esc(item.category)}</div><h2 id="detail-title">${esc(isSkill?item.label:item.title)}</h2>${isSkill?`<code>${item.name}</code>`:""}</div><button class="icon-button" data-action="close-detail" aria-label="关闭详情" title="关闭">${icon("x")}</button></div>
      <div class="dialog-body"><p>${esc(item.desc)}</p>${isSkill?`<dl class="dialog-contract"><dt>输入</dt><dd>${esc(item.input)}</dd><dt>输出</dt><dd>${esc(item.output)}</dd><dt>适用时机</dt><dd>${esc(item.when)}</dd></dl><div class="focus-callout"><strong>${icon("asterisk")} 特别注意</strong><p>${esc(item.focus)}</p></div>${codeBlock(`${state.tool==="codex"?"$":"/"}${item.name}${["bulk-archive","onboard"].includes(id)?"":" add-dark-mode"}`,"AI 对话 · 根据情境补充参数")}`:`<p>${esc(item.detail)}</p>${codeBlock(item.code,"参考命令 / 配置")}${id==="cli"?`<figure style="margin:20px 0"><img src="assets/openspec-dashboard.png" alt="OpenSpec 官方终端仪表盘示意截图" style="width:100%;max-height:420px;object-fit:contain"><figcaption style="font-size:10px;color:#8a9484">官方历史示例图，不代表当前项目数据。</figcaption></figure>`:""}`}${refs(item.refs)}</div>
      <div class="dialog-footer"><button class="text-link" data-action="star" data-id="${id}">${icon("bookmark")} ${state.stars.includes(id)?"已关注，点击取消":"加入我的关注"}</button><button class="button" data-action="feature-commands">${icon("terminal")} 查看命令速查</button></div>`;
    showDetail();
  }
  function showDetail() {
    const dialog = $("#detail-dialog");
    hydrate();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
  function parseLocation() {
    const hash = location.hash.slice(1) || "roadmap";
    const [route,param] = hash.split("/");
    state.route = navs.some(n=>n[0]===route) ? route : "roadmap";
    if (state.route==="lab" && param) {
      const index = D.flow.findIndex(f=>f.id===param);
      if (index>=0) { state.labStep=index; state.labFile=""; }
    }
    $("#detail-dialog").close();
    $("#search-dialog").close();
    $("#sidebar").classList.remove("open");
    $("#scrim").classList.remove("open");
    $("#menu-toggle").setAttribute("aria-expanded","false");
    syncSidebarAccess();
    render();
    if (param && state.route==="features") {
      const type = D.skills.some(s=>s.id===param) ? "skill" : "capability";
      openFeature(param,type);
    } else if (param && ["specs","sources"].includes(state.route)) {
      requestAnimationFrame(()=>document.getElementById(param)?.scrollIntoView({behavior:"auto",block:"start"}));
    } else window.scrollTo({top:0,behavior:"auto"});
  }
  function searchItems(query) {
    const q = query.trim().toLowerCase();
    const all = [
      ...D.stages.map(s=>({title:s.title,desc:s.intro,kind:"学习阶段",action:"lesson",id:s.id,icon:s.icon,extra:s.points.flat().join(" ")})),
      ...D.skills.map(s=>({title:`${s.label} · ${s.name}`,desc:s.desc,kind:s.group==="core"?"核心 Skill":"可选 Skill",action:"search-skill",id:s.id,icon:s.icon,extra:s.focus})),
      ...D.capabilities.map(s=>({title:s.title,desc:s.desc,kind:s.level,action:"search-capability",id:s.id,icon:s.icon,extra:s.detail})),
      ...D.commands.map((c,i)=>({title:c[2],desc:skillCommand(c[3]),kind:c[1],action:"search-command",id:String(i),icon:"terminal",extra:c[4]}))
    ];
    return (q ? all.filter(s=>`${s.title} ${s.desc} ${s.extra}`.toLowerCase().includes(q)) : all.filter(s=>s.kind==="学习阶段")).slice(0,18);
  }
  function renderSearch() {
    const found = searchItems($("#search-input").value);
    $("#search-results").innerHTML = found.length ? found.map(s=>`<button class="search-result" data-action="${s.action}" data-id="${esc(s.id)}">${icon(s.icon)}<div><strong>${esc(s.title)}</strong><p>${esc(s.desc)}</p></div><small>${s.kind}</small>${icon("arrow-up-right")}</button>`).join("") : `<div class="empty-state">${icon("search-x")}<h3>没有找到匹配内容</h3><p>试试“归档”“verify”“全局”或“格式”。</p></div>`;
    hydrate();
  }
  function lintExample(text) {
    const errors = [], warnings = [];
    const lines = text.replace(/\r\n/g,"\n").split("\n");
    let inFence = false;
    const useful = lines.filter(line=>{
      if (/^\s*(```|~~~)/.test(line)) { inFence=!inFence; return false; }
      return !inFence;
    });
    if (!useful.some(l=>/^## ADDED Requirements\s*$/.test(l))) errors.push("此新增能力练习需要二级标题：## ADDED Requirements。");
    const reqs = useful.map((line,i)=>/^### Requirement:\s*\S/.test(line)?i:-1).filter(i=>i>=0);
    if (!reqs.length) errors.push("没有找到三级需求标题：### Requirement: 名称。");
    if (useful.some(l=>/^#{1,3}\s*Scenario:/.test(l))) errors.push("Scenario 标题必须使用四个 #：#### Scenario: 名称。");
    reqs.forEach((start,n)=>{
      const block = useful.slice(start+1,reqs[n+1]??useful.length);
      const scenarios = block.map((line,i)=>/^#### Scenario:\s*\S/.test(line)?i:-1).filter(i=>i>=0);
      if (!scenarios.length) errors.push(`第 ${n+1} 个需求缺少四级 Scenario 标题。`);
      if (!block.some(l=>/\b(SHALL|MUST)\b/.test(l))) warnings.push(`第 ${n+1} 个需求建议明确使用 SHALL / MUST。`);
      scenarios.forEach((idx,j)=>{
        const scenario = block.slice(idx+1,scenarios[j+1]??block.length).join("\n");
        if (!/\b(WHEN|GIVEN)\b/.test(scenario)||!/\bTHEN\b/.test(scenario)) errors.push(`第 ${n+1} 个需求的场景 ${j+1} 需要 WHEN/GIVEN 与 THEN。`);
      });
    });
    const msgs=[...errors,...warnings];
    return `<strong class="${errors.length?"report-error":"report-success"}">${errors.length?`发现 ${errors.length} 个结构问题`:"本练习的基本结构检查通过"}${warnings.length?`，${warnings.length} 项建议`:""}</strong>${msgs.length?`<ul>${msgs.map(m=>`<li>${esc(m)}</li>`).join("")}</ul>`:"<p>下一步：检查行为是否完整，并在真实项目运行官方严格校验。</p>"}`;
  }
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
        const host = document.querySelector("dialog[open]") || document.body;
        host.appendChild(ta); ta.focus(); ta.select();
        const ok = document.execCommand("copy"); ta.remove();
        if (!ok) throw new Error("copy failed");
      }
      toast("已复制，仅写入剪贴板，未执行命令");
    } catch { toast("浏览器限制了复制，请选中内容后复制。"); }
  }
  function toggleCompleted(id, checked) {
    if (!D.stages.some(s=>s.id===id)) return;
    state.completed = checked ? [...new Set([...state.completed,id])] : state.completed.filter(x=>x!==id);
    persist(); updateProgress();
    if (state.route==="roadmap") renderRoadmap();
    hydrate();
  }
  function exportProgress() {
    const text = `# OpenSpec 学习记录\n\n教程版本：${D.version}\n资料核对：${D.checked}\n导出时间：${new Date().toLocaleString("zh-CN")}\n\n## 学习路线\n${D.stages.map(s=>`- [${state.completed.includes(s.id)?"x":" "}] ${s.title}`).join("\n")}\n\n## 我的关注\n${state.stars.map(id=>{const s=[...D.skills,...D.capabilities].find(x=>x.id===id);return `- ${s?.label||s?.title||id}`;}).join("\n")||"暂无"}\n\n## 笔记\n${state.notes||"暂无"}\n\n## 资料\n${D.sources.map(s=>`- [${s.id}] ${s.title}: ${s.url}`).join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text],{type:"text/markdown;charset=utf-8"}));
    const a = document.createElement("a"); a.href=url; a.download="OpenSpec-learning-notes.md";
    document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast("已导出 Markdown 学习记录");
  }
  document.addEventListener("click", event=>{
    if (event.target.closest(".skip-link")) {
      event.preventDefault();main.focus();main.scrollIntoView({behavior:"auto"});return;
    }
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const {action,id,index,file} = el.dataset;
    if (action==="copy") { copy(el.dataset.copy); return; }
    if (action==="lesson") { $("#search-dialog").close(); openLesson(id); return; }
    if (action==="close-detail") { $("#detail-dialog").close(); return; }
    if (action==="close-search") { $("#search-dialog").close(); return; }
    if (action==="next-lesson") {
      toggleCompleted(modalItem.id,true); openLesson(id); return;
    }
    if (action==="finish-lesson") { toggleCompleted(id,true); $("#detail-dialog").close(); toast(state.completed.length===6?"路线已完成，去真实项目走一遍":"已标记本节完成"); return; }
    if (action==="feature") { openFeature(id,el.dataset.type); return; }
    if (action==="feature-commands") { $("#detail-dialog").close(); location.hash="commands"; return; }
    if (action==="overview-step") { state.overviewStep=Number(index); renderRoadmap(); hydrate(); return; }
    if (action==="star") {
      state.stars=state.stars.includes(id)?state.stars.filter(x=>x!==id):[...state.stars,id]; persist();
      if (state.route==="features") renderFeatures();
      if ($("#detail-dialog").open && modalItem && modalItem.type!=="lesson") openFeature(modalItem.id,modalItem.type);
      hydrate(); toast(state.stars.includes(id)?"已加入我的关注":"已取消关注"); return;
    }
    if (action==="reset-filters") { state.featureCategory="all"; state.hotOnly=false; state.starsOnly=false; renderFeatures(); hydrate(); return; }
    if (action==="lab-step") { state.labStep=Number(index); state.labFile=""; renderLab(); hydrate(); return; }
    if (action==="lab-next"||action==="lab-prev"||action==="lab-reset") {
      state.labStep=action==="lab-reset"?0:Math.max(0,Math.min(5,state.labStep+(action==="lab-next"?1:-1)));
      state.labFile=""; renderLab(); hydrate(); return;
    }
    if (action==="lab-file") { state.labFile=file; renderLab(); hydrate(); return; }
    if (action==="tool") { state.tool=id; persist(); renderCommands(); hydrate(); return; }
    if (action==="lint") { state.editorReport=lintExample(state.editorText); $("#editor-report").innerHTML=state.editorReport; return; }
    if (action==="editor-reset") { state.editorText=D.examples.spec; state.editorReport=null; $("#spec-editor-input").value=state.editorText; $("#editor-report").innerHTML=""; return; }
    if (action==="copy-editor") { copy(state.editorText); return; }
    if (action==="quiz-submit") {
      state.quizSubmitted=true;
      D.quiz.forEach((_,i)=>$(`#quiz-feedback-${i}`).innerHTML=quizFeedback(i));
      $("#quiz-score").textContent=quizScore(); return;
    }
    if (action==="quiz-reset") { state.quizAnswers={}; state.quizSubmitted=false; renderSpecs(); hydrate(); $("#quiz").scrollIntoView({behavior:"auto"}); return; }
    if (action==="config-tab") { state.configTab=id; renderPractices(); hydrate(); return; }
    if (action==="search-skill"||action==="search-capability") { $("#search-dialog").close(); openFeature(id,action==="search-skill"?"skill":"capability"); return; }
    if (action==="search-command") { $("#search-dialog").close(); state.commandQuery=D.commands[Number(id)][2];state.commandGroup="全部";state.commandType="全部";location.hash="commands"; if(state.route==="commands"){renderCommands();hydrate();}return; }
    if (action==="confirm-reset") {
      $("#detail-content").innerHTML=`<div class="dialog-heading"><h2 id="detail-title">重置学习记录？</h2><button class="icon-button" data-action="close-detail" title="关闭" aria-label="关闭详情">${icon("x")}</button></div><div class="dialog-body"><p>将清除本教程的学习进度、关注、笔记和工具偏好。其他应用的数据不受影响。此操作无法撤销，建议先导出记录。</p></div><div class="dialog-footer"><button class="button" data-action="close-detail">取消</button><button class="button primary" data-action="reset-data">${icon("rotate-ccw")} 确认重置</button></div>`;showDetail();return;
    }
    if (action==="reset-data") { state.completed=[];state.stars=[];state.notes="";state.tool="codex";persist();$("#detail-dialog").close();render();toast("学习记录已重置"); }
  });
  document.addEventListener("change",event=>{
    const el=event.target;
    if (el.dataset.stage) { toggleCompleted(el.dataset.stage,el.checked); return; }
    if (el.id==="feature-category") { state.featureCategory=el.value;renderFeatures();hydrate(); }
    if (el.id==="hot-filter") { state.hotOnly=el.checked;renderFeatures();hydrate(); }
    if (el.id==="stars-filter") { state.starsOnly=el.checked;renderFeatures();hydrate(); }
    if (el.id==="command-group") { state.commandGroup=el.value;updateCommandTable(); }
    if (el.id==="command-type") { state.commandType=el.value;updateCommandTable(); }
    if (el.dataset.quiz!==undefined) { state.quizAnswers[Number(el.dataset.quiz)]=Number(el.value); if(state.quizSubmitted){$(`#quiz-feedback-${el.dataset.quiz}`).innerHTML=quizFeedback(Number(el.dataset.quiz));$("#quiz-score").textContent=quizScore();} }
  });
  function updateCommandTable() { $("#command-rows").innerHTML=commandRows();$("#command-count").textContent=`${D.commands.filter(commandMatches).length} 条命令`;hydrate(); }
  document.addEventListener("input",event=>{
    const el=event.target;
    if (el.id==="learning-notes") {state.notes=el.value;persist();$("#note-status").textContent=storageAvailable?"已保存在当前浏览器":"无法保存，请导出记录";}
    if (el.id==="spec-editor-input") {state.editorText=el.value;state.editorReport=null;$("#editor-report").innerHTML="";}
    if (el.id==="command-search") {state.commandQuery=el.value;updateCommandTable();}
    if (el.id==="search-input") renderSearch();
  });
  $("#search-trigger").addEventListener("click",()=>{ $("#detail-dialog").close();$("#search-input").value="";renderSearch();$("#search-dialog").showModal();$("#search-input").focus(); });
  $("#export-progress").addEventListener("click",exportProgress);
  function closeMenu() {
    $("#sidebar").classList.remove("open");$("#scrim").classList.remove("open");$("#menu-toggle").setAttribute("aria-expanded","false");syncSidebarAccess();
  }
  function syncSidebarAccess() {
    $("#sidebar").inert = window.matchMedia("(max-width: 800px)").matches && !$("#sidebar").classList.contains("open");
  }
  $("#menu-toggle").addEventListener("click",()=>{$("#sidebar").classList.toggle("open");$("#scrim").classList.toggle("open");$("#menu-toggle").setAttribute("aria-expanded",String($("#sidebar").classList.contains("open")));syncSidebarAccess();});
  $("#scrim").addEventListener("click",closeMenu);
  window.matchMedia("(max-width: 800px)").addEventListener("change",syncSidebarAccess);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&$("#sidebar").classList.contains("open")){closeMenu();$("#menu-toggle").focus();}});
  for (const dialog of document.querySelectorAll("dialog")) dialog.addEventListener("click",event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  window.addEventListener("hashchange",parseLocation);
  parseLocation();
})();
