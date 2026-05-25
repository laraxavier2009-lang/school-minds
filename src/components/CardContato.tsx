interface Props {
  icone: string;
  titulo: string;
  subtitulo: string;
  numero?: string;
  telefone?: string;
  textoBotao?: string;
  corFundo: string;
  corBorda: string;
  corDestaque: string;
}

export function CardContato({
  icone,
  titulo,
  subtitulo,
  numero,
  telefone,
  textoBotao,
  corFundo,
  corBorda,
  corDestaque,
}: Props) {
  return (
    <div
      className="rounded-2xl border-2 p-5"
      style={{ background: corFundo, borderColor: corBorda }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {icone}
        </span>
        <div className="flex-1">
          <h3 className="text-lg font-extrabold" style={{ color: 'var(--cor-texto)' }}>
            {titulo}
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--cor-texto-leve)' }}>
            {subtitulo}
          </p>
          {numero && (
            <div className="mt-3 text-4xl font-extrabold" style={{ color: corDestaque }}>
              {numero}
            </div>
          )}
        </div>
      </div>
      {telefone && (
        <a
          href={`tel:${telefone}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: corDestaque, minHeight: 52 }}
        >
          📞 {textoBotao ?? 'Ligar agora'}
        </a>
      )}
    </div>
  );
}