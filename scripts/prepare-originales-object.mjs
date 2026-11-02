// Deterministic low-power poster from the supplied mesh (no external image or renderer).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import sharp from "sharp";
globalThis.ProgressEvent ??= class extends Event {
  constructor(type, values) {
    super(type);
    Object.assign(this, values);
  }
};
const folder = path.resolve("public/originales/3d/abstract_shape");
const json = JSON.parse(
  await readFile(path.join(folder, "scene.gltf"), "utf8"),
);
json.buffers[0].uri = `data:application/octet-stream;base64,${(await readFile(path.join(folder, "scene.bin"))).toString("base64")}`;
const { scene: model } = await new GLTFLoader().parseAsync(
  JSON.stringify(json),
  "",
);
const box = new THREE.Box3().setFromObject(model),
  centre = box.getCenter(new THREE.Vector3()),
  size = box.getSize(new THREE.Vector3());
model.position.sub(centre);
const normalizer = new THREE.Group();
normalizer.add(model);
normalizer.scale.setScalar(2.15 / Math.max(size.x, size.y, size.z));
const root = new THREE.Group();
root.add(normalizer);
root.rotation.set(0.2, -0.4, -0.15);
root.updateMatrixWorld(true);
const camera = new THREE.PerspectiveCamera(36, 800 / 900, 0.1, 30);
camera.position.z = 4.5;
camera.updateMatrixWorld();
const faces = [];
root.traverse((mesh) => {
  if (!mesh.isMesh) return;
  const position = mesh.geometry.attributes.position,
    normal = mesh.geometry.attributes.normal,
    index = mesh.geometry.index;
  const matrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const points = ids.map((id) =>
      new THREE.Vector3()
        .fromBufferAttribute(position, id)
        .applyMatrix4(mesh.matrixWorld),
    );
    const n = ids
      .reduce(
        (sum, id) =>
          sum.add(new THREE.Vector3().fromBufferAttribute(normal, id)),
        new THREE.Vector3(),
      )
      .normalize()
      .applyMatrix3(matrix)
      .normalize();
    const depth = points.reduce((sum, p) => sum + p.z, 0) / 3;
    const reflected =
      0.35 +
      0.4 * Math.max(0, n.y) +
      0.6 * Math.exp(-Math.pow((n.x + 0.35) * 4, 2)) +
      0.3 * Math.exp(-Math.pow((n.y - 0.5) * 9, 2));
    const light = Math.round(Math.min(242, 48 + reflected * 145));
    const colour = `rgb(${light},${Math.min(255, light + 2)},${Math.max(0, light - 5)})`;
    const d =
      points
        .map((p, j) => {
          p.project(camera);
          return `${j ? "L" : "M"}${((p.x + 1) * 400).toFixed(2)} ${((1 - p.y) * 450).toFixed(2)}`;
        })
        .join(" ") + " Z";
    faces.push({
      depth,
      path: `<path d="${d}" fill="${colour}" stroke="${colour}" stroke-width=".55"/>`,
    });
  }
});
faces.sort((a, b) => a.depth - b.depth);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900">${faces.map((f) => f.path).join("")}</svg>`;
const out = await sharp(Buffer.from(svg))
  .webp({ quality: 88, alphaQuality: 100, effort: 6 })
  .toBuffer();
await writeFile("public/originales/3d/abstract-shape-poster.webp", out);
console.log(`Mesh poster: ${faces.length} triangles, ${out.length} bytes`);
