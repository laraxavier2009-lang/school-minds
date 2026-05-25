import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ChatBubble } from "@/components/ChatBubble";
import { BotaoOpcao } from "@/components/BotaoOpcao";
import { ProgressoPerguntas } from "@/components/ProgressoPerguntas";
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