import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listarDesabafos, type DesabafoAnonimo } from "@/lib/dados";
import { LABELS_TEMA, type Tema } from "@/lib/triagem";

const CORES_TEMA: Record<Tema, string> = {
  ansiedade: "bg-violet-100 text-violet-800",
  tristeza: "bg-blue-100 text-blue-800",
  bullying: "bg-orange-100 text-orange-800",
  luto: "bg-slate-100 text-slate-800",
  estresse: "bg-amber-100 text-amber-900",
  pedir_ajuda: "bg-emerald-100 text-emerald-800",
};

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
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="mural-desabafos-titulo" className="text-xl font-extrabold text-slate-900">
            Mural de desabafos
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Mensagens anônimas compartilhadas pelo portal estudantil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void atualizarMural()}
          disabled={carregando}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {carregando ? "Atualizando…" : "Atualizar mural"}
        </button>
      </header>

      {carregando ? (
        <p className="py-6 text-center text-sm text-slate-600" role="status">
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
        <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          Nenhum desabafo registrado recentemente.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {desabafos.map((desabafo) => (
            <li
              key={desabafo.id}
              className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    ehTema(desabafo.tema)
                      ? CORES_TEMA[desabafo.tema]
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {ehTema(desabafo.tema) ? LABELS_TEMA[desabafo.tema] : desabafo.tema}
                </span>
                <time className="text-xs text-slate-500" dateTime={desabafo.criado_em}>
                  {new Date(desabafo.criado_em).toLocaleString("pt-BR")}
                </time>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                {desabafo.texto}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
