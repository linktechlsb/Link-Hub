import { useEffect, useRef } from "react";

import type { HeatmapPonto } from "@link-leagues/types";

/** Paleta azul → verde → amarelo → vermelho usada para colorir a intensidade. */
const GRADIENTE: Array<[number, [number, number, number]]> = [
  [0.0, [16, 40, 78]], // navy
  [0.4, [84, 100, 132]], // link-blue
  [0.65, [254, 198, 65]], // brand-yellow
  [1.0, [220, 53, 69]], // vermelho
];

function corPorIntensidade(t: number): [number, number, number] {
  for (let i = 1; i < GRADIENTE.length; i++) {
    const [p0, c0] = GRADIENTE[i - 1]!;
    const [p1, c1] = GRADIENTE[i]!;
    if (t <= p1) {
      const f = (t - p0) / (p1 - p0 || 1);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return GRADIENTE[GRADIENTE.length - 1]![1];
}

interface HeatmapCanvasProps {
  pontos: HeatmapPonto[];
}

/**
 * Overlay de mapa de calor a partir de coordenadas relativas (0..1) dos
 * cliques, sem dependências externas: acumula blobs radiais em escala de cinza
 * e depois colore cada pixel pela intensidade. Preenche o elemento pai
 * (posicionado), para ser sobreposto a um preview da página.
 */
export function HeatmapCanvas({ pontos }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const desenhar = () => {
      const largura = canvas.clientWidth;
      const altura = canvas.clientHeight;
      if (largura === 0 || altura === 0) return;
      canvas.width = largura;
      canvas.height = altura;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, largura, altura);
      if (pontos.length === 0) return;

      // 1) Acumula intensidade em escala de cinza (alpha), com blobs sobrepostos.
      const raio = Math.max(largura, altura) * 0.07;
      for (const p of pontos) {
        const x = p.pos_x * largura;
        const y = p.pos_y * altura;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, raio);
        grad.addColorStop(0, "rgba(0,0,0,0.4)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
      }

      // 2) Encontra o pico de intensidade para normalizar (poucos cliques também
      //    devem render­izar com contraste total: o ponto mais quente vira vermelho).
      const img = ctx.getImageData(0, 0, largura, altura);
      const dados = img.data;
      let maxAlpha = 0;
      for (let i = 3; i < dados.length; i += 4) {
        if (dados[i]! > maxAlpha) maxAlpha = dados[i]!;
      }
      if (maxAlpha === 0) return;

      // 3) Coloriza cada pixel pela intensidade normalizada (0..1).
      for (let i = 0; i < dados.length; i += 4) {
        const alpha = dados[i + 3]!;
        if (alpha === 0) continue;
        const t = alpha / maxAlpha;
        const [r, g, b] = corPorIntensidade(t);
        dados[i] = r;
        dados[i + 1] = g;
        dados[i + 2] = b;
        // opacidade visível mesmo nas bordas frias, saturando nas quentes
        dados[i + 3] = Math.round((0.35 + 0.55 * t) * 255);
      }
      ctx.putImageData(img, 0, 0);
    };

    desenhar();
    const observer = new ResizeObserver(desenhar);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [pontos]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
