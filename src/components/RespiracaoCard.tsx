import { useEffect, useState } from "react";

type Fase = "inspira" | "segura" | "solta";

// Técnica 4-7-8 adaptada (usa 4-4-4 por simplicidade visual/animação)
export function RespiracaoCard({ compact = false }: { compact?: boolean }) {
  const [fase, setFase] = useState<Fase>("inspira");
  useEffect(() => {
    const ordem: Fase[] = ["inspira", "segura", "solta"];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % 3;
      setFase(ordem[i]);
    }, 4000);
    return () => clearInterval(id);
  }, []);
  const labels: Record<Fase, string> = {
    inspira: "Inspira",
    segura: "Segura",
    solta: "Solta",
  };
  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{ background: "linear-gradient(135deg, #E8F4FD 0%, #E8F8EF 100%)" }}
    >
      <h3 className="text-base font-extrabold" style={{ color: "var(--cor-primaria)" }}>
        🫁 Respira comigo antes de começar
      </h3>
      {!compact && (
        <p className="mt-1 text-xs" style={{ color: "var(--cor-texto-leve)" }}>
          Uma respiração calma ajuda a organizar as ideias.
        </p>
      )}
      <div className="my-4 flex h-28 items-center justify-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{
            background: "var(--cor-primaria)",
            transform: fase === "inspira" || fase === "segura" ? "scale(1.2)" : "scale(0.85)",
            transition: "transform 4s ease-in-out",
          }}
        >
          {labels[fase]}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs font-semibold" style={{ color: "var(--cor-texto-leve)" }}>
        <span>Inspira · 4s</span>
        <span>Segura · 4s</span>
        <span>Solta · 4s</span>
      </div>
    </div>
  );
}