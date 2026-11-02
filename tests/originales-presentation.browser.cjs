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
      await page
        .locator(
          "[data-scene] > [data-bottle] img,[data-scene] > [data-box] img,[data-scene] > div[class*=heroBackdrop] img",
        )
        .count(),
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
      scrollTo({ top: innerHeight * 0.7, behavior: "instant" });
    });
    await page.waitForFunction(
      () => Math.abs(scrollY - innerHeight * 1.12) < 3,
    );
    await page.waitForTimeout(1400);
    assert.equal(
      await page.locator("[data-docked=true]").count(),
      0,
      "magnet lands on the full price view, not the compact view",
    );
    const pricePhotos = page.locator("[data-product-gallery] button");
    await pricePhotos.nth(1).click();
    await page.waitForTimeout(1000);
    const aperture = await page.locator("[class*=photoAperture]").boundingBox();
    const fullPrice = await page.locator("[data-purchase]").boundingBox();
    assert.ok(
      Math.abs(aperture.width - aperture.height) < 2,
      "photography uses a square aperture",
    );
    assert.ok(
      aperture.x + aperture.width < fullPrice.x,
      "gallery stays beside the full price view without overlapping it",
    );
    assert.equal(
      await page.locator("[role=dialog][data-state=open]").count(),
      0,
      "photographs stay in the same stage, no popup",
    );
    await pricePhotos.first().click();
    await page.waitForTimeout(600);
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
    await page.evaluate(() => {
      window.__originalesPurchase = document.querySelector("[data-purchase]");
      window.__originalesBottle = document.querySelector("[data-bottle]");
      scrollTo({ top: innerHeight * 1.7, behavior: "instant" });
    });
    await page.waitForFunction(
      () => Math.abs(scrollY - innerHeight * 1.82) < 3,
    );
    await page.waitForTimeout(1400);
    assert.equal(await page.locator("[data-docked=true]").count(), 1);
    assert.equal(
      await page
        .locator("[data-purchase]")
        .evaluate((el) => el === window.__originalesPurchase),
      true,
      "same live purchase controls dock under bottle",
    );
    assert.equal(
      await page
        .locator("[data-bottle]")
        .evaluate((el) => el === window.__originalesBottle),
      true,
    );
    const fixedPurchase = await page.locator("[data-purchase]").boundingBox();
    assert.ok(
      fixedPurchase.x < 720 && fixedPurchase.y + fixedPurchase.height < 1000,
      "sticky controls stay below the product and inside viewport",
    );
    const galleryPhotos = page.locator("[data-product-gallery] button");
    assert.ok(
      (await galleryPhotos.count()) > 1,
      "real uploaded database images are available",
    );
    await galleryPhotos.nth(1).click();
    await page.waitForTimeout(1100);
    assert.equal(
      await page
        .locator("[data-product-gallery][data-photo-active=true]")
        .count(),
      1,
    );
    assert.ok(
      await page
        .getByAltText(/product photograph/)
        .evaluate((el) => el.complete && el.naturalWidth > 0),
      "selected uploaded photo decodes",
    );
    await galleryPhotos.first().click();
    await page.waitForTimeout(950);
    assert.equal(
      await page
        .locator("[data-product-gallery][data-photo-active=false]")
        .count(),
      1,
    );
    await galleryPhotos.nth(1).click();
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(1800);
    assert.equal(
      await page
        .locator("[data-bottle]")
        .evaluate((el) => Number(getComputedStyle(el).opacity)),
      1,
      "scrolling back restores original presentation even with a photo selected",
    );
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
    await page.waitForTimeout(1200);
    assert.equal(
      await page
        .locator("[data-scene]")
        .evaluate((el) => getComputedStyle(el).position),
      "relative",
      "mobile is a stable normal-flow product layout",
    );
    const mobileBottleStart = await page.locator("[data-bottle]").boundingBox();
    await page.evaluate(() => scrollTo({ top: 100, behavior: "instant" }));
    await page.waitForTimeout(500);
    const mobileBottleScrolled = await page
      .locator("[data-bottle]")
      .boundingBox();
    assert.ok(
      Math.abs(mobileBottleStart.y - mobileBottleScrolled.y - 100) < 3,
      "mobile bottle scrolls with its composition instead of floating",
    );
    await page
      .locator('[data-purchase] button[aria-label="Add to bag"]')
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
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
    await page.evaluate(() =>
      scrollTo({ top: innerHeight * 2.1, behavior: "instant" }),
    );
    await page.waitForTimeout(1800);
    const mobileDock = await page
      .locator("[data-mobile-purchase-dock]")
      .boundingBox();
    assert.ok(
      mobileDock.x >= 0 &&
        mobileDock.y > 300 &&
        mobileDock.y + mobileDock.height < 667,
      "mobile purchase bar stays inside viewport",
    );
    assert.equal(
      await page.locator("[data-purchase]").evaluate((el) => el.inert),
      true,
      "offscreen duplicate actions are removed from keyboard navigation",
    );
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(800);
    assert.equal(
      await page.locator("[data-mobile-purchase-dock]").count(),
      0,
      "mobile bar disappears when returning to product",
    );
    assert.equal(
      await page.locator("[data-purchase]").evaluate((el) => el.inert),
      false,
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
      "PASS four-bottle opening, persistent sticky scene, active silhouettes, frosted title/no flying notes, docking, rapid quantity changes, cart/morph, magnetic price/dock stops, seamless square photo stage at full price, database photos, reverse-scroll restoration, touch notes/no plus, stable mobile composition and conditional purchase bar, reduced motion and main-store restoration.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
