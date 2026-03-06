import { useRef, useEffect } from "react";

// --- PARTICLE SYSTEM ---
function Particles({ eco }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);

    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 60; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.3,
          size: 1 + Math.random() * 2,
          alpha: 0.1 + Math.random() * 0.3,
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      const speed = 0.3 + eco.currentSpeed * 2;
      const windBias = (eco.windSpeed - 0.3) * 1.5;

      particlesRef.current.forEach((p) => {
        p.x += (p.vx + windBias * 0.5) * speed;
        p.y += p.vy * speed * 0.6;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const stress = eco.stressIndex;
        const r = Math.round(180 + stress * 75);
        const g = Math.round(200 - stress * 80);
        const b = Math.round(220 - stress * 40);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + stress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * (0.5 + eco.airQuality * 0.5)})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, [eco]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
}

export default Particles;
