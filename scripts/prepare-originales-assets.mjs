/** Re-encode already generated local cutouts; never edits Storage or product rows. */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source)
  throw new Error(
    "Pass the imagegen output directory. See src/features/originales/README.md.",
  );
const root = path.resolve("public/originales");
const files = {
  "ambrato-bottle": "exec-190cdccc-d512-48d0-a4b3-fa44bc9d9673.png",
  "ambrato-box": "exec-0d22f1e4-c9b3-403c-9a5b-4ad38a8c0785.png",
  "sultanic-bottle": "exec-146c18b4-6887-4d26-8eb6-8539e2539c7a.png",
  "sultanic-box": "exec-65f0763f-51ae-426a-acab-0aad8fe83422.png",
  "lustra-bottle": "exec-e9ab98c0-4847-4ad0-a549-fffb87b579b7.png",
  "lustra-box": "exec-8afbf8da-0baf-4985-9150-314ee114383f.png",
  "lazvaro-bottle": "exec-8be7092f-80c3-4db0-ab1d-0191116ba7c6.png",
  "lazvaro-box": "exec-939fd571-7203-4ca8-beaa-7fe1d25ca22d.png",
};
const atmospheres = {
  ambrato: "exec-1b7bff9f-9850-4b5a-a455-df5be27a20fb.png",
  sultanic: "exec-5a96d1fa-208f-4e91-85b4-d265af9edcf4.png",
  lustra: "exec-57a3bee5-3394-4c28-9f98-127d1bb388a8.png",
  lazvaro: "exec-cda1c048-612f-4ba1-b1a9-809ae8034de4.png",
};
await fs.mkdir(path.join(root, "source"), { recursive: true });
for (const [name, file] of Object.entries(files)) {
  const input = path.join(source, file);
  const metadata = await sharp(input).metadata();
  if (!metadata.hasAlpha) throw new Error(`${name} is missing transparency`);
  await fs.copyFile(input, path.join(root, "source", `${name}.png`));
  const output = path.join(root, `${name}.webp`);
  await sharp(input)
    .trim({ background: "#00000000", threshold: 0 })
    .resize({ height: 1100, withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(output);
  const stats = await fs.stat(output);
  console.log(`${name}: ${Math.round(stats.size / 1024)} KB, alpha preserved`);
}
for (const [name, file] of Object.entries(atmospheres)) {
  const input = path.join(source, file);
  await fs.copyFile(input, path.join(root, "source", `${name}-atmosphere.png`));
  await sharp(input)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toFile(path.join(root, `${name}-atmosphere.webp`));
  console.log(`${name} atmosphere encoded`);
}
