"use client";
import { useEffect } from "react";
export function AdminDropUpload() {
  useEffect(() => {
    function inputFor(target: EventTarget | null) {
      let el = target instanceof Element ? target : null;
      let depth = 0;
      while (el && el !== document.body && depth++ < 4) {
        const input = el.querySelector<HTMLInputElement>(
          'input[type="file"]:not(:disabled)',
        );
        if (input) return input;
        el = el.parentElement;
      }
      return null;
    }
    function over(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      const input = inputFor(e.target);
      if (input) e.dataTransfer.dropEffect = "copy";
    }
    function drop(e: DragEvent) {
      if (e.defaultPrevented || !e.dataTransfer?.files.length) return;
      e.preventDefault();
      const input = inputFor(e.target);
      if (!input) return;
      const transfer = new DataTransfer();
      Array.from(e.dataTransfer.files)
        .slice(0, input.multiple ? undefined : 1)
        .forEach((f) => transfer.items.add(f));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    document.addEventListener("dragover", over);
    document.addEventListener("drop", drop);
    return () => {
      document.removeEventListener("dragover", over);
      document.removeEventListener("drop", drop);
    };
  }, []);
  return null;
}
