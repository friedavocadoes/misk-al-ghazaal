import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshTransmissionMaterial } from "@pmndrs/vanilla/materials/MeshTransmissionMaterial.js";

/** A real bevelled glass mesh, refracting the scene image and reflecting studio lighting. */
export async function mountGlassName(
  host: HTMLElement,
  name: string,
  backdrop: string | null,
  signal: AbortSignal,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 760 ? 1.25 : 1.5),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  camera.position.z = 200;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const material = new MeshTransmissionMaterial({
    samples: innerWidth < 760 ? 2 : 3,
    _transmission: 1,
    thickness: 10,
    roughness: 0.035,
    chromaticAberration: 0.012,
    anisotropicBlur: 0.01,
    distortion: 0,
  });
  material.ior = 1.46;
  material.color.set("#f0f3ef");
  material.clearcoat = 1;
  material.envMapIntensity = 1.7;
  const target = new THREE.WebGLRenderTarget(512, 192, {
    type: THREE.HalfFloatType,
  });
  material.uniforms.buffer.value = target.texture;
  const planeGeometry = new THREE.PlaneGeometry(2, 2);
  const planeMaterial = new THREE.MeshBasicMaterial({ color: "#e3dfd5" });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.z = -24;
  scene.add(plane);
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-60, 110, 150);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xd6dfed, 1.5);
  fill.position.set(100, -30, 80);
  scene.add(fill);
  let geometry: TextGeometry | null = null,
    texture: THREE.Texture | null = null;
  let mesh: THREE.Mesh<TextGeometry, MeshTransmissionMaterial> | null = null;
  let frame = 0,
    disposed = false,
    last = 0,
    visible = true,
    width = 0,
    height = 0;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    signal.removeEventListener("abort", cleanup);
    renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    delete host.dataset.rendered;
    geometry?.dispose();
    texture?.dispose();
    planeGeometry.dispose();
    planeMaterial.dispose();
    material.dispose();
    target.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
  const contextLost = () => cleanup();
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  });
  observer.observe(host);
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    const [font, image] = await Promise.all([
      new FontLoader().loadAsync(
        "/originales/fonts/helvetiker_regular.typeface.json",
      ),
      backdrop
        ? new THREE.TextureLoader().loadAsync(backdrop).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (disposed || signal.aborted) {
      image?.dispose();
      cleanup();
      return cleanup;
    }
    texture = image;
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      planeMaterial.map = texture;
      planeMaterial.color.set("#fff");
      planeMaterial.needsUpdate = true;
    }
    geometry = new TextGeometry(name, {
      font,
      size: 1,
      depth: 0.055,
      curveSegments: 8,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.035,
      bevelSegments: 4,
    });
    geometry.computeBoundingBox();
    geometry.center();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    // Browser shader errors must leave the readable heading intact, never an empty canvas.
    let shaderFailed = false;
    renderer.debug.onShaderError = () => {
      shaderFailed = true;
    };
    let previousBounds = "";
    const draw = (stamp: number) => {
      if (disposed || !mesh) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || !visible || stamp - last < 33) return;
      last = stamp;
      const heading = host.parentElement!;
      const glass =
        Number.parseFloat(
          getComputedStyle(heading).getPropertyValue("--glass"),
        ) || 0;
      if (glass < 0.005) return;
      const bounds = host.getBoundingClientRect();
      const signature = [bounds.left, bounds.top, bounds.width, bounds.height]
        .map((value) => value.toFixed(2))
        .join(":");
      if (signature === previousBounds) return;
      previousBounds = signature;
      const w = Math.min(1600, Math.max(1, Math.round(bounds.width))),
        h = Math.min(420, Math.max(1, Math.round(bounds.height)));
      if (w !== width || h !== height) {
        // Keep GPU buffers fixed while the DOM title changes size on scroll.
        if (!width || !height) {
          renderer.setSize(w, h, false);
          target.setSize(Math.min(w, 900), Math.min(h, 300));
        }
        width = w;
        height = h;
        camera.left = -w / 2;
        camera.right = w / 2;
        camera.top = h / 2;
        camera.bottom = -h / 2;
        camera.updateProjectionMatrix();
        mesh.scale.set(
          (w - 6) / size.x,
          (h * 0.76) / size.y,
          (h * 0.76) / size.y,
        );
        material.uniforms.thickness.value = Math.max(3, h * 0.07);
      }
      const stage = heading.closest<HTMLElement>("[data-scene]");
      const stageRect = stage?.getBoundingClientRect();
      if (stageRect && texture) {
        const image = texture.image as HTMLImageElement;
        const cover = Math.max(
          stageRect.width / image.width,
          stageRect.height / image.height,
        );
        const imageW = image.width * cover,
          imageH = image.height * cover;
        // Offset the actual background sample as the same heading moves through the scene.
        texture.repeat.set(bounds.width / imageW, bounds.height / imageH);
        texture.offset.set(
          (bounds.left - stageRect.left + (imageW - stageRect.width) / 2) /
            imageW,
          1 -
            (bounds.bottom - stageRect.top + (imageH - stageRect.height) / 2) /
              imageH,
        );
      }
      plane.scale.set(w / 2, h / 2, 1);
      scene.environmentRotation.y =
        (bounds.left / Math.max(innerWidth, 1)) * 0.45;
      light.position.x =
        -w * 0.35 + (bounds.top / Math.max(innerHeight, 1)) * w * 0.3;
      material.uniforms.time.value = stamp * 0.001;
      try {
        mesh.visible = false;
        plane.visible = true;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        mesh.visible = true;
        plane.visible = false;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      } catch {
        cleanup();
        return;
      }
      if (shaderFailed) {
        cleanup();
        return;
      }
      if (!disposed) host.dataset.rendered = "true";
    };
    frame = requestAnimationFrame(draw);
  } catch {
    cleanup();
  }
  return cleanup;
}
