import { Link } from '@tanstack/react-router';
import type { Tema } from '@/lib/triagem';

interface Props {
  icone: string;
  label: string;
  tema: Tema;
  destaque?: boolean;
}

export function BotaoTema({ icone, label, tema, destaque }: Props) {
  const baseStyle = destaque
    ? {
        background: '#FFF3F3',
        borderColor: 'var(--cor-crise)',
        color: 'var(--cor-crise)',
      }
    : {
        background: "var(--cor-card)",
        borderColor: 'transparent',
        color: 'var(--cor-texto)',
      };

  return (
    <Link
      to="/triagem/$tema"
      params={{ tema }}
      className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${destaque ? 'col-span-2' : ''}`}
      style={{
        ...baseStyle,
        boxShadow: '0 2px 12px rgba(27, 108, 168, 0.08)',
        minHeight: 84,
      }}
    >
      <span className="flex items-center gap-3">
        <span className="text-2xl">{icone}</span>
        <span className="text-base font-bold">{label}</span>
      </span>
      <span aria-hidden className="text-xl opacity-60">→</span>
    </Link>
  );
}