"use client";

import { useEffect, useRef } from "react";
import { FLUID } from "./config";
import s from "./originales.module.css";

/** Decorative, bounded WebGL caustics. It never intercepts scroll, clicks or text. */
export default function FluidSurface({ color }: { color: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const device = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    if (
      !node ||
      reduced.matches ||
      device.connection?.saveData ||
      (device.deviceMemory ?? 8) <= 2 ||
      (navigator.hardwareConcurrency || 8) <= 2
    )
      return;
    const gl = node.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(
      gl.VERTEX_SHADER,
      "attribute vec2 a; varying vec2 v; void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}",
    );
    const fragment = compile(
      gl.FRAGMENT_SHADER,
      `precision mediump float;
      varying vec2 v; uniform float t; uniform float energy; uniform float waves; uniform float aspect; uniform vec2 pointer; uniform vec3 color;
      void main(){
        vec2 p=(v-.5)*vec2(aspect,1.); vec2 m=(pointer-.5)*vec2(aspect,1.);
        float d=length(p-m); float ripple=sin(d*24.-t*1.6)*exp(-d*3.)*energy;
        float flow=sin(p.x*3.1+sin(p.y*4.2+t*.19)+t*.12)+sin(p.y*4.5+cos(p.x*3.7-t*.16));
        float light=pow(max(0.,sin(flow*3.5+ripple*2.)),9.);
        float shade=sin(flow*1.8+ripple)*.5+.5;
        float alpha=(light*.15+shade*.065)*waves;
        gl_FragColor=vec4(mix(color,vec3(1.),light*.8),alpha);
      }`,
    );
    const program = gl.createProgram();
    if (!program || !vertex || !fragment) {
      shaders.forEach((x) => gl.deleteShader(x));
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      shaders.forEach((x) => gl.deleteShader(x));
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const location = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const time = uniform("t"),
      energyLocation = uniform("energy"),
      pointerLocation = uniform("pointer");
    const hex = color.replace("#", "");
    gl.uniform3f(
      uniform("color"),
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    );
    gl.uniform1f(uniform("waves"), FLUID.waves);
    let frame = 0,
      last = 0,
      energy = 0,
      visible = true,
      lost = false,
      scrollY = window.scrollY;
    let px = 0.5,
      py = 0.5,
      targetX = 0.5,
      targetY = 0.5;
    const resize = () => {
      const rect = node.getBoundingClientRect();
      const scale =
        Math.min(1, 960 / Math.max(rect.width, 1)) * FLUID.resolution;
      node.width = Math.max(1, Math.round(rect.width * scale));
      node.height = Math.max(1, Math.round(rect.height * scale));
      gl.viewport(0, 0, node.width, node.height);
      gl.uniform1f(uniform("aspect"), node.width / node.height);
    };
    const move = (event: PointerEvent) => {
      const r = node.getBoundingClientRect();
      targetX = (event.clientX - r.left) / r.width;
      targetY = 1 - (event.clientY - r.top) / r.height;
      energy = Math.min(1.5, energy + 0.13);
    };
    const scroll = () => {
      energy = Math.min(
        1.5,
        energy + Math.abs(window.scrollY - scrollY) * 0.003,
      );
      scrollY = window.scrollY;
    };
    const draw = (stamp: number) => {
      if (lost) return;
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden || reduced.matches || stamp - last < 33)
        return;
      last = stamp;
      energy *= FLUID.viscosity;
      px += (targetX - px) * 0.04;
      py += (targetY - py) * 0.04;
      gl.uniform1f(time, stamp * 0.001);
      gl.uniform1f(energyLocation, energy);
      gl.uniform2f(pointerLocation, px, py);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const contextLost = () => {
      lost = true;
      cancelAnimationFrame(frame);
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    observer.observe(node);
    const ro = new ResizeObserver(resize);
    ro.observe(node);
    resize();
    node.addEventListener("webglcontextlost", contextLost);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      node.removeEventListener("webglcontextlost", contextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach((x) => gl.deleteShader(x));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [color]);
  return <canvas ref={canvas} className={s.fluid} aria-hidden="true" />;
}
