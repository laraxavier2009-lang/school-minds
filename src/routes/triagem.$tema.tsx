import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ChatBubble } from "@/components/ChatBubble";
import { BotaoOpcao } from "@/components/BotaoOpcao";
import { ProgressoPerguntas } from "@/components/ProgressoPerguntas";
import { RespiracaoCard } from "@/components/RespiracaoCard";
import {
  PERGUNTAS_POR_TEMA,
  LABELS_TEMA,
  calcularNivel,
  isTema,
} from "@/lib/triagem";

export const Route = createFileRoute("/triagem/$tema")({
  beforeLoad: ({ params }) => {
    if (!isTema(params.tema)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: `Triagem — ${isTema(params.tema) ? LABELS_TEMA[params.tema] : ""}` },
    ],
  }),
  component: Perguntas,
});

function Perguntas() {
  const { tema } = Route.useParams();
  const navigate = useNavigate();

  if (!isTema(tema)) return null;
  const perguntas = useMemo(() => PERGUNTAS_POR_TEMA[tema], [tema]);

  const [idx, setIdx] = useState(0);
  const [pesos, setPesos] = useState<number[]>([]);
  const [respirou, setRespirou] = useState(false);

  const finalizar = (todos: number[]) => {
    const nivel = calcularNivel(todos);
    navigate({
      to: "/resultado/$nivel",
      params: { nivel },
      search: { tema },
    });
  };

  const escolher = (peso: number) => {
    const novos = [...pesos, peso];
    if (peso === 3) {
      finalizar(novos);
      return;
    }
    if (idx + 1 >= perguntas.length) {
      finalizar(novos);
      return;
    }
    setPesos(novos);
    setIdx(idx + 1);
  };

  const pergunta = perguntas[idx];

  if (!respirou) {
    return (
      <main className="px-5 pt-4 pb-10">
        <header className="mb-4 flex items-center gap-3">
          <Link
            to="/temas"
            aria-label="Voltar"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm"
            style={{ color: "var(--cor-primaria)" }}
          >
            ←
          </Link>
          <div className="flex-1">
            <ProgressoPerguntas atual={0} total={perguntas.length} labelTema={LABELS_TEMA[tema]} />
          </div>
        </header>

        <div className="mt-4 space-y-5">
          <ChatBubble texto="Antes de começarmos, que tal respirarmos juntos por alguns segundos? Isso ajuda a se acalmar." />
          <RespiracaoCard />
          <button
            type="button"
            onClick={() => setRespirou(true)}
            className="flex h-[52px] w-full items-center justify-center rounded-xl text-[17px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--cor-primaria)" }}
          >
            Estou pronto(a) para conversar →
          </button>
          <button
            type="button"
            onClick={() => setRespirou(true)}
            className="block w-full text-center text-sm underline-offset-2 hover:underline"
            style={{ color: "var(--cor-texto-leve)" }}
          >
            Pular respiração
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 pt-4 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to="/temas"
          aria-label="Voltar"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm"
          style={{ color: "var(--cor-primaria)" }}
        >
          ←
        </Link>
        <div className="flex-1">
          <ProgressoPerguntas atual={idx} total={perguntas.length} labelTema={LABELS_TEMA[tema]} />
        </div>
      </header>

      <div className="mt-6">
        <ChatBubble texto={pergunta.texto} />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {pergunta.opcoes.map((op, i) => (
          <BotaoOpcao
            key={`${pergunta.id}-${i}`}
            texto={op.texto}
            onClick={() => escolher(op.peso)}
          />
        ))}
      </div>
    </main>
  );
}