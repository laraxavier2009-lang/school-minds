import { useEffect, useState } from 'react';

const CHAVE = 'tema-preferido';

export function AlternadorTema() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE);
    const inicial = salvo
      ? salvo === 'escuro'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setEscuro(inicial);
    document.documentElement.classList.toggle('dark', inicial);
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle('dark', novo);
    localStorage.setItem(CHAVE, novo ? 'escuro' : 'claro');
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo noturno'}
      title={escuro ? 'Modo claro' : 'Modo noturno'}
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full text-base transition-all duration-300 ease-in-out hover:-translate-y-0.5"
      style={{
        background: 'var(--cor-card)',
        border: '1px solid var(--cor-borda)',
        color: 'var(--cor-texto)',
        boxShadow: '0 2px 10px rgba(11, 19, 43, 0.15)',
      }}
    >
      <span aria-hidden>{escuro ? '☀️' : '🌙'}</span>
    </button>
  );
}
