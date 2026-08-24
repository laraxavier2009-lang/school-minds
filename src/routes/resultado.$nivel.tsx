import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChatBubble } from "@/components/ChatBubble";
import { CardContato } from "@/components/CardContato";
import { isNivel, isTema, type Tema } from "@/lib/triagem";
import logoBrain from "@/assets/logo-brain.png";

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

  if (nivel === "leve") return <RespostaLeve tema={tema} />;
  if (nivel === "medio") return <RespostaMedio tema={tema} />;
  return <RespostaGrave tema={tema} />;
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

function ConfirmacaoPedidoAjuda({ prioridade }: { prioridade: "alta" | "urgente" }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border-2 p-5"
      style={{
        background: "linear-gradient(135deg, #E8F4FD 0%, #FFF3F3 100%)",
        borderColor: prioridade === "urgente" ? "var(--cor-crise)" : "var(--cor-primaria)",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">🤝</span>
        <div>
          <h3 className="text-lg font-extrabold" style={{ color: "var(--cor-texto)" }}>
            Seu pedido chegou até nós
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--cor-texto)" }}>
            {prioridade === "urgente"
              ? "Recebemos seu pedido com prioridade máxima. A equipe da escola já foi avisada e vai te procurar com carinho e discrição — você não está sozinho(a)."
              : "Recebemos seu pedido com prioridade. A equipe de orientação foi avisada e vai encontrar um jeito acolhedor de te procurar nos próximos dias."}
          </p>
          <p className="mt-2 text-[13px]" style={{ color: "var(--cor-texto-leve)" }}>
            Seu nome não aparece. Apenas o tema e o nível de atenção foram compartilhados.
          </p>
        </div>
      </div>
    </div>
  );
}

function RespostaMedio({ tema }: { tema?: Tema }) {
  return (
    <main className="px-5 pt-6 pb-10 space-y-5">
      <div className="flex justify-center">
        <img src={logoBrain} alt="Saúde Mental na Escola" className="h-28 w-auto" />
      </div>
      <h1 className="text-center text-[22px] font-extrabold" style={{ color: "var(--cor-texto)" }}>
        Percebo que tem sido difícil
      </h1>
      <ChatBubble texto="Você não precisa carregar isso sozinho(a). Conversar com alguém de confiança pode ajudar muito." />

      {tema === "pedir_ajuda" && <ConfirmacaoPedidoAjuda prioridade="alta" />}

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

function RespostaGrave({ tema }: { tema?: Tema }) {
  const [mostrarContatos, setMostrarContatos] = useState(false);
  const [desabafo, setDesabafo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function avancar() {
    if (enviando) return;
    setEnviando(true);
    try {
      await salvarDesabafo(tema ?? "pedir_ajuda", desabafo);
    } finally {
      setEnviando(false);
      setMostrarContatos(true);
    }
  }


  return (
    <main className="px-5 pt-0 pb-10 space-y-4">
      <div
        className="-mx-5 px-5 py-3 text-center text-sm font-bold"
        style={{ background: "#FFEBEE", color: "var(--cor-crise)" }}
      >
        🔴 Você não está sozinho(a). Ajuda real está disponível agora.
      </div>

      <div className="pt-4 space-y-4">
        <ChatBubble texto="Sinto muito que você está passando por isso. Como sou um robô, preciso garantir sua segurança com ajuda de uma pessoa real." />

        <ChatBubble texto="Sinto muito que você esteja passando por isso. Se quiser, você pode usar o espaço abaixo para desabafar ou escrever o que está sentindo agora. Sua mensagem será salva anonimamente no nosso sistema para ajudar a coordenação a entender as principais dores dos estudantes, mas sua identidade nunca será revelada. Esse espaço é totalmente opcional." />
      </div>

      {tema === "pedir_ajuda" && <ConfirmacaoPedidoAjuda prioridade="urgente" />}

      {!mostrarContatos && (
        <div className="space-y-3">
          <label htmlFor="desabafo" className="sr-only">
            Espaço de desabafo (opcional)
          </label>
          <textarea
            id="desabafo"
            value={desabafo}
            onChange={(e) => setDesabafo(e.target.value)}
            placeholder="Escreva aqui seu desabafo (opcional)..."
            className="min-h-[180px] w-full resize-none rounded-[12px] border border-[#D1E3F0] bg-white p-4 text-[16px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)]"
            style={{ color: "var(--cor-texto)" }}
          />
          <p className="text-center text-[12px]" style={{ color: "var(--cor-texto-leve)" }}>
            Seu relato é guardado de forma totalmente anônima, sem qualquer ligação com você.
          </p>

          <button
            type="button"
            disabled={enviando}
            onClick={() => void avancar()}
            className="flex h-[52px] w-full items-center justify-center rounded-xl text-[17px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
            style={{ background: "var(--cor-secundaria)" }}
          >
            {enviando ? "Enviando..." : "Pronto, quero ver os canais de ajuda →"}
          </button>

          <button
            type="button"
            onClick={() => setMostrarContatos(true)}
            className="block w-full text-center text-sm underline-offset-2 hover:underline"
            style={{ color: "var(--cor-texto-leve)" }}
          >
            Pular para contatos de ajuda
          </button>
        </div>
      )}

      {mostrarContatos && (
        <div className="space-y-4 animate-fade-in-up">
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
        </div>
      )}
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