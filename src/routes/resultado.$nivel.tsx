import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChatBubble } from "@/components/ChatBubble";
import { CardContato } from "@/components/CardContato";
import { supabase } from "@/integrations/supabase/client";
import { isNivel, isTema, type Tema } from "@/lib/triagem";

type Search = { tema?: Tema };

export const Route = createFileRoute("/resultado/$nivel")({
  beforeLoad: ({ params }) => {
    if (!isNivel(params.nivel)) throw notFound();
  },
  validateSearch: (s: Record<string, unknown>): Search => {
    const tema = typeof s.tema === "string" && isTema(s.tema) ? s.tema : undefined;
    return { tema };
  },
  head: () => ({ meta: [{ title: "Resposta — Saúde Mental na Escola" }] }),
  component: Resultado,
});

function Resultado() {
  const { nivel } = Route.useParams();
  const { tema } = Route.useSearch();
  if (!isNivel(nivel)) return null;

  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current || !tema) return;
    enviado.current = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("registros")
          .insert({ tema, nivel_risco: nivel })
          .select()
          .single();
        if (error || !data) return;
        if (nivel === "medio" || nivel === "grave") {
          await supabase
            .from("alertas")
            .insert({ registro_id: data.id, status: "pendente", prazo_dias: 7 });
        }
      } catch {
        // silencioso — não bloquear a tela de acolhimento por erro de rede
      }
    })();
  }, [tema, nivel]);

  if (nivel === "leve") return <RespostaLeve tema={tema} />;
  if (nivel === "medio") return <RespostaMedio />;
  return <RespostaGrave />;
}

function RespostaLeve({ tema }: { tema?: Tema }) {
  const dica = tema
    ? DICAS_POR_TEMA[tema]
    : "Reserve um tempo do seu dia para fazer algo que te faça bem.";
  return (
    <main className="px-5 pt-6 pb-10 space-y-5">
      <div className="flex justify-center">
        <div className="animate-bounce-in text-7xl">💚</div>
      </div>
      <h1 className="text-center text-2xl font-extrabold" style={{ color: "var(--cor-primaria)" }}>
        Obrigado por compartilhar
      </h1>
      <ChatBubble texto="É normal sentir-se assim às vezes. Você fez bem em parar e prestar atenção em como está se sentindo." />

      <RespiracaoCard />

      <div
        className="rounded-2xl border-l-4 bg-white p-5"
        style={{
          borderLeftColor: "var(--cor-secundaria)",
          boxShadow: "0 2px 12px rgba(46, 204, 113, 0.10)",
        }}
      >
        <h3 className="text-base font-bold" style={{ color: "var(--cor-texto)" }}>
          💡 Uma dica de autocuidado
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--cor-texto-leve)" }}>
          {dica}
        </p>
      </div>

      <Link
        to="/"
        className="flex h-[52px] w-full items-center justify-center rounded-xl text-[18px] font-bold text-white"
        style={{ background: "var(--cor-secundaria)" }}
      >
        Encerrar conversa
      </Link>
    </main>
  );
}

function RespostaMedio() {
  return (
    <main className="px-5 pt-6 pb-10 space-y-5">
      <div className="flex justify-center text-6xl">🤝</div>
      <h1 className="text-center text-[22px] font-extrabold" style={{ color: "var(--cor-texto)" }}>
        Percebo que tem sido difícil
      </h1>
      <ChatBubble texto="Você não precisa carregar isso sozinho(a). Conversar com alguém de confiança pode ajudar muito." />

      <div
        className="rounded-2xl border-l-4 bg-white p-5"
        style={{ borderLeftColor: "var(--cor-alerta)", boxShadow: "0 2px 12px rgba(230, 126, 34, 0.10)" }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏫</span>
          <div>
            <h3 className="text-base font-extrabold" style={{ color: "var(--cor-texto)" }}>
              Orientação Pedagógica da escola
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--cor-texto-leve)" }}>
              Procure na secretaria ou sala de orientação.
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border-l-4 bg-white p-5"
        style={{ borderLeftColor: "var(--cor-primaria)", boxShadow: "0 2px 12px rgba(27, 108, 168, 0.10)" }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">👩‍🏫</span>
          <div>
            <h3 className="text-base font-extrabold" style={{ color: "var(--cor-texto)" }}>
              Um professor de confiança
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--cor-texto-leve)" }}>
              Fale com aquele professor com quem você se sente bem.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[13px]" style={{ color: "var(--cor-texto-leve)" }}>
        A escola foi notificada de que um aluno pediu apoio. Ninguém saberá que foi você.
      </p>

      <div className="space-y-3">
        <Link
          to="/"
          className="flex h-[52px] w-full items-center justify-center rounded-xl text-[18px] font-bold text-white"
          style={{ background: "var(--cor-secundaria)" }}
        >
          Já pedi ajuda
        </Link>
        <Link
          to="/"
          className="flex h-[44px] w-full items-center justify-center rounded-xl text-base font-semibold"
          style={{ background: "transparent", color: "var(--cor-texto-leve)" }}
        >
          Encerrar
        </Link>
      </div>
    </main>
  );
}

function RespostaGrave() {
  return (
    <main className="px-5 pt-0 pb-10 space-y-4">
      <div
        className="-mx-5 px-5 py-3 text-center text-sm font-bold"
        style={{ background: "#FFEBEE", color: "var(--cor-crise)" }}
      >
        🔴 Você não está sozinho(a). Ajuda real está disponível agora.
      </div>

      <div className="pt-4">
        <ChatBubble texto="Sinto muito que você está passando por isso. Como sou um robô, preciso garantir sua segurança com ajuda de uma pessoa real." />
      </div>

      <CardContato
        icone="📞"
        titulo="CVV — Centro de Valorização da Vida"
        subtitulo="Ligação gratuita, sigilosa, 24 horas por dia."
        numero="188"
        telefone="188"
        textoBotao="Ligar agora"
        corFundo="#FFEBEE"
        corBorda="#F5B7B1"
        corDestaque="#E74C3C"
      />

      <CardContato
        icone="🚑"
        titulo="SAMU — Emergência médica"
        subtitulo="Emergências de saúde 24h."
        numero="192"
        telefone="192"
        textoBotao="Ligar SAMU"
        corFundo="#FFF3E0"
        corBorda="#F5CBA7"
        corDestaque="#E67E22"
      />

      <div
        className="rounded-2xl border-2 p-5"
        style={{ background: "#E3F2FD", borderColor: "#85C1E9" }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏫</span>
          <div>
            <h3 className="text-lg font-extrabold" style={{ color: "var(--cor-texto)" }}>
              Fale com um adulto agora
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--cor-texto-leve)" }}>
              Procure um professor, coordenador ou qualquer adulto de confiança na escola agora mesmo.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[13px]" style={{ color: "var(--cor-texto-leve)" }}>
        A equipe da escola foi avisada de que um aluno precisa de apoio. Você não será identificado(a).
      </p>

      <Link
        to="/"
        className="flex h-[52px] w-full items-center justify-center rounded-xl text-[18px] font-bold"
        style={{ background: "#E5E9EE", color: "var(--cor-texto)" }}
      >
        Encerrar
      </Link>
    </main>
  );
}

function RespiracaoCard() {
  const [fase, setFase] = useState<"inspira" | "segura" | "solta">("inspira");
  useEffect(() => {
    const ordem: Array<typeof fase> = ["inspira", "segura", "solta"];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % 3;
      setFase(ordem[i]);
    }, 4000);
    return () => clearInterval(id);
  }, []);
  const labels: Record<typeof fase, string> = {
    inspira: "Inspira",
    segura: "Segura",
    solta: "Solta",
  };

  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{
        background: "linear-gradient(135deg, #E8F4FD 0%, #E8F8EF 100%)",
      }}
    >
      <h3 className="text-lg font-extrabold" style={{ color: "var(--cor-primaria)" }}>
        🫁 Respira comigo
      </h3>
      <div className="my-4 flex h-32 items-center justify-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full text-sm font-bold text-white transition-transform"
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

const DICAS_POR_TEMA: Record<Tema, string> = {
  ansiedade: "Diminua a rotação: ouça uma música calma, escreva o que está sentindo ou caminhe 5 minutos em silêncio.",
  tristeza: "Permita-se sentir, mas também busque pequenos prazeres: um banho quente, conversar com alguém ou um filme leve.",
  bullying: "Você não merece ser tratado(a) assim. Anote o que aconteceu e fale com um adulto de confiança quando puder.",
  luto: "Não há tempo certo para a dor. Conversar sobre quem você perdeu, mesmo que doa, ajuda a guardar boas memórias.",
  estresse: "Faça uma pausa real de tela e tarefas. Beba água, alongue o corpo e respire fundo por 1 minuto.",
  pedir_ajuda: "Reconhecer que precisa de ajuda já é um passo enorme. Procure alguém da escola para conversar nos próximos dias.",
};