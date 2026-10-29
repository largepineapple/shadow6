/* Actual browser interaction checks. --record adds a narrated 2–3 min silent walkthrough. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const root = path.resolve(__dirname, "..");
const record = process.argv.includes("--record");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file = path.join(file, "index.html");
  fs.readFile(file, (error, data) => {
    if (error) res.writeHead(404).end();
    else {
      res.setHeader(
        "Content-Type",
        mime[path.extname(file)] || "application/octet-stream",
      );
      res.end(data);
    }
  });
});
let browser;
const out = path.join(root, "output");
fs.mkdirSync(path.join(out, "screenshots"), { recursive: true });
async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/demo/`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    ...(record
      ? {
          recordVideo: {
            dir: path.join(out, "raw-video"),
            size: { width: 1440, height: 1024 },
          },
        }
      : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const checks = [];
  const screenshot = (name) =>
    page.screenshot({
      path: path.join(out, "screenshots", name + ".png"),
      fullPage: true,
      style: "#walkthrough-caption{visibility:hidden!important}",
    });
  async function caption(text, hold = 0) {
    if (!record) return;
    await page.evaluate((text) => {
      let el = document.querySelector("#walkthrough-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "walkthrough-caption";
        el.style.cssText =
          "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);width:max-content;max-width:92vw;z-index:1000;padding:15px 25px;background:#202640f2;color:white;border-radius:12px;font:15px Microsoft YaHei,sans-serif;line-height:1.7;box-shadow:0 8px 25px #0003;pointer-events:none";
        document.body.append(el);
      }
      el.textContent = text;
    }, text);
    if (hold) await page.waitForTimeout(hold);
  }
  await page.goto(base);
  await screenshot("01-entry");
  await caption(
    "开拍小笺｜给独立咖啡店主：把已有照片，整理成可以拍摄的 15 秒脚本。",
    11000,
  );
  await page.locator("#blank-start").click();
  await page.locator("#to-confirm").click();
  assert.match(await page.locator("[role=alert]").innerText(), /准备三张/);
  checks.push("empty input validation");
  await caption(
    "自己开始时，缺少素材会收到明确提示。也可以先用示例完整体验，无需登录。",
    8000,
  );
  await page.locator("#fill-sample").click();
  await page
    .locator('[data-upload="0"]')
    .setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
  await page.locator(".inline-file-error").waitFor();
  assert.match(
    await page.locator(".inline-file-error").innerText(),
    /无法读取/,
  );
  assert.equal(await page.locator("#to-confirm").isEnabled(), true);
  await page
    .locator('[data-upload="0"]')
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.waitForFunction(
    () => document.querySelector(".asset-top span")?.textContent === "本地照片",
  );
  checks.push("local image validation and successful read");
  await page.locator("#fill-sample").click();
  await caption(
    "第一步：已有成品、制作和环境三张照片，分别标记用途，避免文案与画面脱节。",
    11000,
  );
  await screenshot("02-materials");
  await page.locator("#price").fill("-1");
  await page.locator("#to-confirm").click();
  assert.match(await page.locator("[role=alert]").innerText(), /价格/);
  checks.push("price validation");
  await page.locator("#price").fill("28");
  await page.locator("#to-confirm").click();
  await screenshot("03-facts");
  assert.equal(await page.locator("#generate").isDisabled(), true);
  await caption(
    "第二步：先确认商品、28 元和已知特点。未知地址、折扣或健康功效，不让 AI 擅自补充。",
    12000,
  );
  await page.locator("#confirmed").check();
  await page.locator("summary").click();
  await page.locator("#fail-next").check();
  await caption(
    "这里可以开启一次模拟失败，便于评审检查异常路径。所有生成均为本地规则模拟。",
    7000,
  );
  await page.locator("#generate").click();
  await page.locator("#retry").waitFor();
  assert.match(await page.locator("[role=alert]").innerText(), /均已保留/);
  checks.push("failure retains brief and retry");
  await screenshot("04-failure");
  await caption(
    "生成失败时，已确认的事实与照片保留，不要求用户重新填写；可以直接重试。",
    10000,
  );
  await page.locator("#retry").click();
  await page.locator("#shot-0").waitFor();
  assert.match(await page.locator("#shot-2").inputValue(), /28元/);
  await screenshot("05-script");
  await caption(
    "第三步：输出三段口播、对应照片和拍摄建议。右侧是分镜预览，不是剪辑成片。",
    11000,
  );
  const second = await page.locator("#shot-1").inputValue();
  const original = await page.locator("#shot-0").inputValue();
  await page.locator('[data-rewrite="0"]').click();
  assert.equal(await page.locator("#shot-1").inputValue(), second);
  assert.notEqual(await page.locator("#shot-0").inputValue(), original);
  await caption(
    "结果不理想时，只改开头：其他两段不变。用户可以继续直接编辑，也可以撤回。",
    11000,
  );
  await page.locator('[data-undo="0"]').click();
  assert.equal(await page.locator("#shot-0").inputValue(), original);
  checks.push("local rewrite isolation and undo");
  await page.locator("#shot-0").fill("今天这杯燕麦拿铁，想喝热的还是冰的？");
  await page.locator("#play").click();
  await caption(
    "每五秒切换一段画面，检查画面与字幕的搭配。口播偏长时，仍需自行精简或延长时长。",
    record ? 15500 : 100,
  );
  await page.locator("#save").click();
  await caption(
    "把修改稿保存到当前浏览器。示例素材可恢复；自己的照片刷新后需要重新选择。",
    9000,
  );
  await page.reload();
  await page.locator("#restore").click();
  assert.match(await page.locator("#shot-0").inputValue(), /想喝热的/);
  checks.push("saved draft refresh recovery");
  await caption(
    "刷新后可继续修改已保存稿，不必重新生成，也不会丢掉刚才人工改过的句子。",
    9000,
  );
  await page.locator("#finish").click();
  await screenshot("06-handoff");
  await caption(
    "最后导出的是拍摄小笺：带时间、画面建议和口播。交给剪辑同伴，或在常用剪辑工具中对照制作。",
    11000,
  );
  const downloading = page.waitForEvent("download");
  await page.locator("#download").click();
  const download = await downloading;
  await download.saveAs(path.join(out, "sample-shooting-note.txt"));
  assert.match(
    fs.readFileSync(path.join(out, "sample-shooting-note.txt"), "utf8"),
    /28元/,
  );
  checks.push("text export");
  await caption(
    "完成后可以返回修改或再做一条；本原型不代替拍摄、不自动发布，也不调用真实 AI。",
    10000,
  );
  await page.locator("#back-result").click();
  await page.locator("#edit-facts").click();
  await page.locator("#price").fill("");
  await page.locator("#feature").fill("");
  await page.locator("#to-confirm").click();
  await page.locator("#confirmed").check();
  await page.locator("#generate").click();
  await page.locator("#shot-0").waitFor();
  assert.doesNotMatch(await page.locator("#shot-2").inputValue(), /元|28/);
  checks.push("unknown price not invented");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await screenshot("07-mobile");
  checks.push("mobile no horizontal overflow");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#edit-facts").click();
  await page.locator("#to-confirm").click();
  await page.locator("#confirmed").check();
  await page.locator("#generate").click();
  assert.equal(
    await page
      .locator(".spinner")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  checks.push("reduced motion");
  await page.locator("#cancel-generation").click();
  await page.waitForTimeout(2900);
  assert.equal(await page.locator("#generate").count(), 1);
  checks.push("cancel stops late generation");
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto(base);
  assert.equal(await freshPage.locator("#restore").count(), 0);
  await fresh.close();
  checks.push("browser draft isolation");
  assert.deepEqual(errors, []);
  checks.push("no uncaught browser errors");
  const video = page.video();
  await context.close();
  if (record) await video.saveAs(path.join(out, "demo-walkthrough.webm"));
  fs.writeFileSync(
    path.join(out, "verification.json"),
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        checks,
        passed: checks.length,
        recorded: record,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Passed ${checks.length} checks${record ? ", walkthrough recorded" : ""}.`,
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.close();
  });
