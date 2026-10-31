/* Opt-in, read-only storefront QA. Uses a fresh guest context; never places an order. */
const assert = require("node:assert/strict");
const { chromium } = require(
  process.env.ORIGINALES_PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.ORIGINALES_QA_URL || "http://localhost:3000";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.ORIGINALES_BROWSER_PATH || undefined,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.route("**/api/analytics/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/originales`, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator("aside").count(),
      0,
      "collection rail must be unmounted",
    );
    assert.equal(
      await page.locator("[data-chapter-bottle]").count(),
      4,
      "one presentation per edition",
    );
    await page.getByRole("button", { name: "Explore the collection" }).click();
    assert.ok(await page.getByRole("dialog").isVisible());
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .locator("[data-edition-chapter]")
      .first()
      .scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        Number(
          getComputedStyle(document.querySelector("[data-chapter-copy]"))
            .opacity,
        ) > 0.99,
    );
    await page.goto(`${base}/originales/originales-lazvaro`, {
      waitUntil: "networkidle",
    });
    assert.equal(await page.locator("h1").count(), 1);
    await page.waitForFunction(
      () =>
        document.querySelector("[data-travelling-title] [data-rendered=true]"),
      {},
      { timeout: 20000 },
    );
    await page.evaluate(() => {
      window.__originalesTitle = document.querySelector("h1");
    });
    const read = () =>
      page
        .locator("h1")
        .evaluate((el) => ({
          x: el.getBoundingClientRect().x,
          y: el.getBoundingClientRect().y,
          glass: Number(getComputedStyle(el).getPropertyValue("--glass")),
          same: el === window.__originalesTitle,
        }));
    const start = await read();
    assert.equal(start.glass, 1);
    await page.evaluate(() =>
      scrollTo({ top: innerHeight * 0.9, behavior: "instant" }),
    );
    await page.waitForTimeout(1800);
    const middle = await read();
    assert.ok(
      middle.x > start.x && middle.y > start.y,
      "one title travels down and right",
    );
    assert.ok(
      middle.glass > 0 && middle.glass < 1,
      "material interpolates during travel",
    );
    assert.ok(middle.same);
    await page.evaluate(() =>
      scrollTo({ top: innerHeight * 1.6, behavior: "instant" }),
    );
    await page.waitForTimeout(1800);
    const end = await read();
    assert.ok(end.same);
    assert.ok(end.glass < 0.001);
    const dock = await page.locator("[data-title-dock]").boundingBox();
    assert.ok(
      Math.abs(end.x - dock.x) < 2 && Math.abs(end.y - dock.y) < 2,
      "same title docks above price",
    );
    assert.equal(
      await page.locator("[data-purchase]").evaluate((el) => el.inert),
      false,
    );
    assert.ok(
      await page.locator("[data-bottle]").evaluate((el) => {
        const m = new DOMMatrix(getComputedStyle(el).transform);
        return Math.abs(m.b) < 0.001 && Math.abs(m.c) < 0.001;
      }),
      "bottle remains upright",
    );
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(2000);
    assert.equal((await read()).glass, 1, "reverse scroll restores glass");
    await page
      .locator("h1 canvas")
      .evaluate((canvas) =>
        canvas
          .getContext("webgl2")
          .getExtension("WEBGL_lose_context")
          .loseContext(),
      );
    await page.waitForFunction(() => !document.querySelector("h1 canvas"));
    assert.equal(
      await page
        .locator("h1>span")
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
      "context loss preserves readable title",
    );
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto(`${base}/originales/originales-lazvaro`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() =>
      scrollTo({ top: innerHeight * 1.6, behavior: "instant" }),
    );
    await page.waitForTimeout(1800);
    const button = await page
      .getByRole("button", { name: "Add to bag", exact: true })
      .boundingBox();
    assert.ok(button.y > 72 && button.y + button.height < 667);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${base}/originales/originales-lazvaro`, {
      waitUntil: "networkidle",
    });
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("h1 canvas").count(), 0);
    assert.equal(
      await page.locator("[data-purchase]").evaluate((el) => el.inert),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS editorial menu/reveals, one live refractive H1, mid-scroll material, docking, reverse scroll, upright bottle, GPU-loss fallback, short mobile and reduced motion.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
