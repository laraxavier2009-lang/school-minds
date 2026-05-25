import { createFileRoute, Link } from "@tanstack/react-router";
import { ChatBubble } from "@/components/ChatBubble";
import { BotaoTema } from "@/components/BotaoTema";
import { ICONES_TEMA, LABELS_TEMA } from "@/lib/triagem";

export const Route = createFileRoute("/temas")({
  head: () => ({
    meta: [
      { title: "Escolha um tema — Saúde Mental na Escola" },
      { name: "description", content: "Escolha o tema que melhor descreve o que você está sentindo." },
    ],
  }),
  component: MenuTemas,
});

function MenuTemas() {
  return (
    <main className="px-5 pt-4 pb-10">
      <header className="flex items-center">
        <Link
          to="/"
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm"
          style={{ color: "var(--cor-primaria)" }}
        >
          ←
        </Link>
      </header>

      <div className="mt-4">
        <ChatBubble texto="Para começarmos, escolha o tema que melhor descreve o que você está sentindo hoje:" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <BotaoTema icone={ICONES_TEMA.ansiedade} label={LABELS_TEMA.ansiedade} tema="ansiedade" />
        <BotaoTema icone={ICONES_TEMA.tristeza} label={LABELS_TEMA.tristeza} tema="tristeza" />
        <BotaoTema icone={ICONES_TEMA.bullying} label={LABELS_TEMA.bullying} tema="bullying" />
        <BotaoTema icone={ICONES_TEMA.luto} label={LABELS_TEMA.luto} tema="luto" />
        <BotaoTema icone={ICONES_TEMA.estresse} label={LABELS_TEMA.estresse} tema="estresse" />
        <BotaoTema icone={ICONES_TEMA.pedir_ajuda} label={LABELS_TEMA.pedir_ajuda} tema="pedir_ajuda" destaque />
      </div>
    </main>
  );
}