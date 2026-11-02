"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import s from "./atelier.module.css";

/** One model/canvas per chapter sequence. Demand rendering; no idle animation loop. */
export function SculptureScene() {
  const host = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false,
      started = false,
      active = false,
      frame = 0;
    let release = () => {},
      invalidate = () => {};
    el.dataset.ready = "false";
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const begin = async () => {
      if (started || reducedMotion || connection?.saveData) return;
      started = true;
      try {
        const [
          THREE,
          { GLTFLoader },
          { RoomEnvironment },
          { atelierGsap },
          { ScrollTrigger },
        ] = await Promise.all([
          import("three"),
          import("three/addons/loaders/GLTFLoader.js"),
          import("three/addons/environments/RoomEnvironment.js"),
          import("./atelier-gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.setClearColor(0x000000, 0);
        const scene = new THREE.Scene(),
          camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
        camera.position.set(0, 0, 4.5);
        const pmrem = new THREE.PMREMGenerator(renderer),
          room = new RoomEnvironment();
        const environment = pmrem.fromScene(room, 0.04);
        scene.environment = environment.texture;
        room.dispose();
        pmrem.dispose();
        const group = new THREE.Group();
        scene.add(group);
        scene.add(new THREE.HemisphereLight(0xf4f4e9, 0x282f29, 2));
        const light = new THREE.DirectionalLight(0xffedcc, 3);
        light.position.set(-3, 4, 4);
        scene.add(light);
        const material = new THREE.MeshPhysicalMaterial({
          color: 0xc9ceca,
          metalness: 1,
          roughness: 0.18,
          clearcoat: 0.65,
          clearcoatRoughness: 0.16,
          envMapIntensity: 1.3,
          side: THREE.DoubleSide,
        });
        const resources: { model?: import("three").Object3D } = {};
        let contextAvailable = true;
        let last = 0;
        const pose = {
          x: 0,
          y: 0,
          rx: 0.2,
          ry: -0.4,
          rz: -0.15,
          scale: 1,
          px: 0,
          py: 0,
        };
        invalidate = () => {
          if (
            disposed ||
            !contextAvailable ||
            frame ||
            !active ||
            document.hidden
          )
            return;
          frame = requestAnimationFrame((time) => {
            frame = 0;
            if (disposed || !contextAvailable) return;
            if (time - last < 30) {
              invalidate();
              return;
            }
            last = time;
            group.position.set(pose.x, pose.y, 0);
            group.rotation.set(pose.rx + pose.py, pose.ry + pose.px, pose.rz);
            group.scale.setScalar(pose.scale);
            renderer.render(scene, camera);
          });
        };
        const resize = new ResizeObserver(() => {
          const { width, height } = el.getBoundingClientRect();
          if (!width || !height) return;
          const factor = Math.min(1, 900 / width, 1000 / height);
          renderer.setSize(width * factor, height * factor, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          invalidate();
        });
        resize.observe(el);
        const lost = (event: Event) => {
          event.preventDefault();
          el.dataset.ready = "false";
          contextAvailable = false;
          active = false;
        };
        renderer.domElement.addEventListener("webglcontextlost", lost);
        el.appendChild(renderer.domElement);
        const { gsap } = await atelierGsap();
        if (disposed) {
          resize.disconnect();
          material.dispose();
          environment.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          return;
        }
        gsap.registerPlugin(ScrollTrigger);
        const parent = el.closest("[data-object-sequence]")!;
        const chapters = [
          ...parent.querySelectorAll<HTMLElement>("[data-snap-panel]"),
        ];
        const ctx = gsap.context(() => {
          const track = gsap.timeline({
            onUpdate: invalidate,
            scrollTrigger: {
              trigger: parent,
              start: "top 80%",
              end: "bottom bottom",
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
          const moves = [
            { x: 0.25, y: 0.1, rx: 0.35, ry: 0.6, rz: 0.15, scale: 1.05 },
            { x: 0.65, y: -0.05, rx: -0.4, ry: 1.7, rz: -0.35, scale: 1.35 },
            { x: -0.2, y: 0.15, rx: 0.65, ry: 2.8, rz: 0.2, scale: 0.88 },
            { x: 0.6, y: -0.3, rx: 0.2, ry: 3.8, rz: -0.25, scale: 1.4 },
            { x: -0.35, y: 0.2, rx: -0.5, ry: 5, rz: 0.35, scale: 1.05 },
            { x: 0.2, y: 0, rx: 0.4, ry: 6.2, rz: -0.15, scale: 1.15 },
          ];
          for (let i = 0; i < Math.max(1, chapters.length); i++)
            track.to(pose, {
              ...moves[i % moves.length],
              duration: 1,
              ease: "power2.inOut",
            });
        }, el);
        const tiltX = gsap.quickTo(pose, "px", {
          duration: 0.7,
          ease: "power3.out",
          onUpdate: invalidate,
        });
        const tiltY = gsap.quickTo(pose, "py", {
          duration: 0.7,
          ease: "power3.out",
          onUpdate: invalidate,
        });
        const pointer = (event: Event) => {
          const p = event as PointerEvent;
          if (p.pointerType !== "mouse") return;
          const r = parent.getBoundingClientRect();
          tiltX(((p.clientX - r.left) / r.width - 0.5) * 0.18);
          tiltY(((p.clientY % innerHeight) / innerHeight - 0.5) * 0.12);
        };
        const rest = () => {
          tiltX(0);
          tiltY(0);
        };
        parent.addEventListener("pointermove", pointer);
        parent.addEventListener("pointerleave", rest);
        const visibility = () => invalidate();
        document.addEventListener("visibilitychange", visibility);
        let released = false;
        release = () => {
          if (released) return;
          released = true;
          ctx.revert();
          tiltX.tween.kill();
          tiltY.tween.kill();
          parent.removeEventListener("pointermove", pointer);
          parent.removeEventListener("pointerleave", rest);
          resize.disconnect();
          cancelAnimationFrame(frame);
          document.removeEventListener("visibilitychange", visibility);
          renderer.domElement.removeEventListener("webglcontextlost", lost);
          resources.model?.traverse((child) => {
            if ((child as import("three").Mesh).isMesh)
              (child as import("three").Mesh).geometry.dispose();
          });
          material.dispose();
          environment.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
        const gltf = await new GLTFLoader().loadAsync(
          "/originales/3d/abstract_shape/scene.gltf",
        );
        const model = gltf.scene;
        resources.model = model;
        if (disposed) {
          model.traverse((child) => {
            const mesh = child as import("three").Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            for (const m of Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material])
              m.dispose();
          });
          return;
        }
        const box = new THREE.Box3().setFromObject(model),
          size = box.getSize(new THREE.Vector3()),
          centre = box.getCenter(new THREE.Vector3());
        model.position.sub(centre);
        const normalizer = new THREE.Group();
        normalizer.add(model);
        normalizer.scale.setScalar(2.15 / Math.max(size.x, size.y, size.z));
        model.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (!mesh.isMesh) return;
          for (const old of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            old.dispose();
          mesh.material = material;
        });
        group.add(normalizer);
        el.dataset.ready = contextAvailable ? "true" : "false";
        invalidate();
      } catch {
        release();
        el.dataset.ready = "false";
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        active = entries[0].isIntersecting;
        if (active) {
          void begin();
          invalidate();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => {
      disposed = true;
      observer.disconnect();
      release();
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);
  return (
    <div className={s.sculptureSticky} aria-hidden="true">
      <div ref={host} className={s.objectScene} data-sculpture-scene>
        <Image
          src="/originales/3d/abstract-shape-poster.webp"
          alt=""
          fill
          sizes="(max-width:759px) 90vw, 45vw"
          className={s.objectPoster}
        />
      </div>
      <span className={s.objectCaption}>
        OBJECT / 01 <span>STUDY IN FORM</span>
      </span>
    </div>
  );
}
