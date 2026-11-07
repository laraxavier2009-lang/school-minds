import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { listarDesabafos, type DesabafoAnonimo } from "@/lib/dados";
import { LABELS_TEMA, type Tema } from "@/lib/triagem";

function ehTema(tema: string): tema is Tema {
  return tema in LABELS_TEMA;
}

export function MuralDesabafos() {
  const [desabafos, setDesabafos] = useState<DesabafoAnonimo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const atualizarMural = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      setDesabafos(await listarDesabafos());
    } catch (error) {
      console.error("[Painel] Falha ao carregar o mural de desabafos.", error);
      setErro(true);
      toast.error("Não foi possível carregar o mural de desabafos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void atualizarMural();
  }, [atualizarMural]);

  return (
    <section
      aria-labelledby="mural-desabafos-titulo"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(27,108,168,0.08)] sm:p-6"
      style={{ fontFamily: "Nunito, system-ui, sans-serif", color: "var(--cor-texto)" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="mural-desabafos-titulo" className="text-xl font-extrabold">
            Mural de desabafos
          </h2>
          <p className="mt-1 text-sm text-[var(--cor-texto-leve)]">
            Mensagens anônimas compartilhadas pelo portal estudantil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void atualizarMural()}
          disabled={carregando}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--cor-primaria)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {carregando && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {carregando ? "Atualizando…" : "Atualizar mural"}
        </button>
      </header>

      {carregando ? (
        <p className="py-6 text-center text-sm text-[var(--cor-texto-leve)]" role="status">
          Carregando desabafos…
        </p>
      ) : erro ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">
          Não foi possível carregar os desabafos.
          <button
            type="button"
            onClick={() => void atualizarMural()}
            className="rounded-md border border-red-300 px-3 py-1.5 hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      ) : desabafos.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-[var(--cor-fundo)] px-4 py-8 text-center text-sm text-[var(--cor-texto-leve)]">
          Nenhum desabafo registrado recentemente.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {desabafos.map((desabafo) => (
            <li
              key={desabafo.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(27,108,168,0.08)] transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-[var(--cor-primaria)] px-2.5 py-1 text-xs font-bold text-white">
                  {ehTema(desabafo.tema) ? LABELS_TEMA[desabafo.tema] : desabafo.tema}
                </span>
                <time
                  className="text-xs text-[var(--cor-texto-leve)]"
                  dateTime={desabafo.criado_em}
                >
                  {new Date(desabafo.criado_em).toLocaleString("pt-BR")}
                </time>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {desabafo.texto}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
