import { useEffect, useRef } from "react";

interface InteractiveGridProps {
  dotDistance?: number;
  dotRadius?: number;
  minProximity?: number;
}

// Reference 9: neutral dots with position-based spectrum connections.
// Draw on interaction/resize, not in an unbounded loop or through React state.
export function InteractiveGrid({
  dotDistance = 30,
  dotRadius = 1.5,
  minProximity = 180,
}: InteractiveGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    const surface = container?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !container || !surface || !context) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const spacing = Math.max(16, dotDistance);
    const radius = Math.max(0.5, dotRadius);
    const proximity = Math.max(1, minProximity);
    let width = 0;
    let height = 0;
    let frame = 0;
    let pointer: { x: number; y: number } | undefined;

    const draw = () => {
      frame = 0;
      context.clearRect(0, 0, width, height);
      const active =
        !reduced.matches && finePointer.matches ? pointer : undefined;
      const hue = active
        ? ((active.x / width + active.y / height) * 360) % 360
        : 0;
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          const distance = active
            ? Math.hypot(x - active.x, y - active.y)
            : Infinity;
          const strength = Math.max(0, 1 - distance / proximity);
          context.fillStyle = strength
            ? `hsl(${hue} 80% ${26 + strength * 24}%)`
            : "rgba(34, 34, 34, 0.22)";
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
          if (active && strength) {
            context.strokeStyle = `hsl(${hue} 80% 42% / ${strength * 0.45})`;
            context.lineWidth = 0.7;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(active.x, active.y);
            context.stroke();
          }
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      schedule();
    };
    const move = (event: PointerEvent) => {
      if (
        event.pointerType === "touch" ||
        reduced.matches ||
        !finePointer.matches
      )
        return;
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      pointer =
        x >= 0 && y >= 0 && x <= width && y <= height ? { x, y } : undefined;
      schedule();
    };
    const leave = () => {
      pointer = undefined;
      schedule();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerleave", leave);
    reduced.addEventListener("change", leave);
    finePointer.addEventListener("change", leave);
    window.addEventListener("resize", resize);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", leave);
      reduced.removeEventListener("change", leave);
      finePointer.removeEventListener("change", leave);
      window.removeEventListener("resize", resize);
    };
  }, [dotDistance, dotRadius, minProximity]);

  return (
    <div className="interactive-grid" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
