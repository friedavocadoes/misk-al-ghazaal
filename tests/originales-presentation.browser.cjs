/* Opt-in browser regression. A new guest context; analytics suppressed; no orders/reviews are submitted. */
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
    page.setDefaultNavigationTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/originales`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1600);
    assert.equal(await page.locator("aside").count(), 0);
    assert.equal(await page.locator("[data-gallery-bottle]").count(), 4);
    assert.equal(await page.locator("[data-originales-nav] a").count(), 4);
    const photos = await page
      .locator("[data-gallery-bottle]")
      .evaluateAll((els) =>
        els.map((el) => ({
          x: el.getBoundingClientRect().x,
          right: el.getBoundingClientRect().right,
          opacity: getComputedStyle(el).opacity,
        })),
      );
    assert.ok(
      photos.every(
        (photo) => photo.x >= 0 && photo.right <= 1440 && photo.opacity === "1",
      ),
      "all four opening bottles fit",
    );
    await page.evaluate(() => {
      window.__originalesBottles = [
        ...document.querySelectorAll("[data-gallery-bottle]"),
      ];
    });
    await page
      .locator("[data-edition-chapter]")
      .nth(1)
      .evaluate((el) =>
        scrollTo({
          top: scrollY + el.getBoundingClientRect().top - 176,
          behavior: "instant",
        }),
      );
    await page.waitForTimeout(2200);
    assert.ok(
      (
        await page
          .locator("[data-originales-nav] [data-active=true]")
          .innerText()
      ).includes("SULTANIC"),
    );
    assert.equal(
      await page.evaluate(() =>
        window.__originalesBottles.every(
          (el, i) =>
            el === document.querySelectorAll("[data-gallery-bottle]")[i],
        ),
      ),
      true,
      "bottles stay the same elements",
    );
    assert.ok(
      await page
        .getByRole("button", { name: "Add to bag", exact: true })
        .isVisible(),
    );
    await page.goto(`${base}/originales/originales-lazvaro`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2400);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(
      await page.locator("canvas,[data-ingredient]").count(),
      0,
      "liquid renderer and floating notes are gone",
    );
    assert.equal(
      await page.locator("[data-scene] img").count(),
      3,
      "backdrop, bottle and box only",
    );
    assert.equal(
      await page
        .locator("h1")
        .evaluate((el) => getComputedStyle(el).textTransform),
      "uppercase",
    );
    await page.evaluate(() => {
      window.__originalesTitle = document.querySelector("h1");
      scrollTo({ top: innerHeight * 0.9, behavior: "instant" });
    });
    await page.waitForTimeout(1800);
    assert.equal(
      await page
        .locator("h1")
        .evaluate((el) => el === window.__originalesTitle),
      true,
    );
    assert.equal(
      await page.locator("[data-purchase]").evaluate((el) => el.inert),
      false,
    );
    const title = await page.locator("h1").boundingBox(),
      dock = await page.locator("[data-title-dock]").boundingBox();
    assert.ok(Math.abs(title.x - dock.x) < 2 && Math.abs(title.y - dock.y) < 2);
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await page.waitForTimeout(700);
    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("misk-cart-v1")),
    );
    assert.equal(cart.length, 1);
    assert.equal(cart[0].qty, 3);
    assert.equal(cart[0].productSlug, "originales-lazvaro");
    assert.equal(await page.locator("button[data-added=true]").count(), 1);
    const width = await page
      .locator("button[data-added=true]")
      .evaluate(
        (el) =>
          el.getBoundingClientRect().width /
          el.parentElement.getBoundingClientRect().width,
      );
    assert.ok(width < 0.9, "success morph shrinks the button");
    await page.locator("#fragrance-notes").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1300);
    assert.equal(
      await page.locator("#fragrance-notes svg.lucide-plus").count(),
      0,
    );
    await page.getByRole("button", { name: "Citrus", exact: true }).click();
    assert.ok(
      await page.locator("[data-radix-popper-content-wrapper]").isVisible(),
    );
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto(`${base}/originales/originales-lazvaro`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() =>
      scrollTo({ top: innerHeight * 0.9, behavior: "instant" }),
    );
    await page.waitForTimeout(1800);
    const button = await page
      .getByRole("button", { name: "Add to bag", exact: true })
      .boundingBox();
    assert.ok(
      button.y > 72 && button.y + button.height < 667,
      JSON.stringify(button),
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await page.goto(`${base}/originales`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    await page
      .locator("[data-edition-chapter]")
      .nth(2)
      .evaluate((el) =>
        scrollTo({
          top: scrollY + el.getBoundingClientRect().top - 152,
          behavior: "instant",
        }),
      );
    await page.waitForTimeout(1800);
    assert.ok(
      (
        await page
          .locator("[data-originales-nav] [data-active=true]")
          .innerText()
      ).includes("LUSTRA"),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${base}/originales/originales-lazvaro`, {
      waitUntil: "networkidle",
    });
    assert.equal(
      await page.locator("[data-purchase]").evaluate((el) => el.inert),
      false,
    );
    await page.goto(`${base}/collection/all`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("#site-header").count(), 1);
    assert.equal(
      await page.evaluate(() => document.body.hasAttribute("data-originales")),
      false,
    );
    assert.equal(
      (
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("misk-cart-v1")),
        )
      )[0].qty,
      3,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS four-bottle opening, persistent sticky scene, active silhouettes, frosted title/no flying notes, docking, rapid quantity changes, cart/morph, touch notes/no plus, short mobile, reduced motion and main-store restoration.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
