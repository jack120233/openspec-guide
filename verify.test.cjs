const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const context = {window:{}};
vm.runInNewContext(read("data.js"), context);
const data = context.window.GUIDE;

test("complete workflow inventory and unique identifiers", () => {
  assert.equal(data.skills.length, 12);
  assert.equal(data.skills.filter(s=>s.group==="core").length, 6);
  assert.equal(data.skills.filter(s=>s.group==="optional").length, 6);
  assert.equal(data.stages.length, 6);
  assert.equal(data.capabilities.length, 16);
  assert.equal(data.commands.length, 54);
  const ids = [...data.skills,...data.capabilities].map(s=>s.id);
  assert.equal(new Set(ids).size, ids.length);
});
test("all source references and workflow links resolve", () => {
  const ids = new Set(data.sources.map(s=>s.id));
  assert.equal(ids.size, 22);
  for (const group of ["stages","skills","capabilities","practices"]) {
    for (const item of data[group]) for (const id of item.refs) assert.ok(ids.has(id), id);
  }
  for (const command of data.commands) assert.ok(ids.has(command[5]));
  for (const stage of data.stages) {
    if (stage.next) assert.ok(data.stages.some(s=>s.id===stage.next));
  }
  for (const source of data.sources) assert.equal(new URL(source.url).protocol,"https:");
});
test("all assistant commands map to known skills", () => {
  for (const item of [...data.commands.filter(c=>c[1]==="AI 对话").map(c=>c[3]),...data.flow.map(f=>f.command)]) {
    for (const [,id] of item.matchAll(/@([\w-]+)/g)) {
      assert.ok(data.skills.some(s=>s.id===id), id);
    }
  }
});
test("offline resources exist and standalone scripts parse", () => {
  for (const file of ["app.js","data.js","assets/lucide.min.js"]) new vm.Script(read(file));
  for (const file of ["styles.css","assets/openspec-dashboard.png","assets/OpenSpec-LICENSE.txt","assets/Lucide-LICENSE.txt"]) {
    assert.ok(fs.statSync(path.join(root,file)).size > 0);
  }
  const html=read("OpenSpec-Learning-Guide.html");
  assert.ok(!/<script[^>]+src=/.test(html),"standalone has no external scripts");
  assert.ok(!/rel="stylesheet"/.test(html),"standalone has no external stylesheet");
  assert.ok(html.includes("data:image/png;base64,"),"dashboard is embedded");
  const scripts=[...html.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)];
  assert.equal(scripts.length,3);
  for (const [,source] of scripts) new vm.Script(source);
  assert.ok(html.indexOf('<main id="main"') < html.indexOf("<script>"),"scripts follow the document");
  assert.ok(html.includes("Lucide Contributors 2022"));
  assert.ok(html.includes("Copyright"),"third-party notices included");
});
test("quiz answers are within the available options", () => {
  assert.equal(data.quiz.length,5);
  for (const question of data.quiz) assert.ok(question.answer>=0 && question.answer<question.options.length);
});
