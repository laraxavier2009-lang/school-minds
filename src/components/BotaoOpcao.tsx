import { useState } from "react";

interface Props {
  texto: string;
  onClick: () => void;
  disabled?: boolean;
}

export function BotaoOpcao({ texto, onClick, disabled }: Props) {
  const [selecionado, setSelecionado] = useState(false);

  const handle = () => {
    if (disabled || selecionado) return;
    setSelecionado(true);
    setTimeout(() => {
      onClick();
      setSelecionado(false);
    }, 300);
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className="w-full text-left rounded-xl border-2 px-4 py-4 text-[16px] leading-snug transition-all"
      style={{
        background: selecionado ? "var(--cor-secundaria)" : "var(--cor-card)",
        borderColor: selecionado ? "var(--cor-secundaria)" : "var(--cor-borda-leve)",
        color: "var(--cor-texto)",
      }}
    >
      <span className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
          style={{
            borderColor: selecionado ? "var(--cor-secundaria)" : "var(--cor-borda-clara)",
            background: selecionado ? "var(--cor-secundaria)" : "transparent",
            color: "#fff",
          }}
        >
          {selecionado ? "✓" : ""}
        </span>
        <span>{texto}</span>
      </span>
    </button>
  );
}
