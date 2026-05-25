interface Props {
  atual: number;
  total: number;
  labelTema: string;
}

export function ProgressoPerguntas({ atual, total, labelTema }: Props) {
  const pct = Math.round(((atual + 1) / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-white"
          style={{ background: 'var(--cor-primaria)' }}
        >
          {labelTema}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--cor-texto-leve)' }}>
          Pergunta {atual + 1} de {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'var(--cor-secundaria)' }}
        />
      </div>
    </div>
  );
}