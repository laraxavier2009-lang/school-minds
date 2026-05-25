interface Props {
  texto: string;
  className?: string;
}

export function ChatBubble({ texto, className = '' }: Props) {
  return (
    <div
      key={texto}
      className={`animate-fade-in bg-white border-l-4 px-5 py-4 text-[16px] leading-relaxed shadow-sm ${className}`}
      style={{
        borderLeftColor: 'var(--cor-primaria)',
        borderRadius: '4px 16px 16px 16px',
        color: 'var(--cor-texto)',
        boxShadow: '0 2px 12px rgba(27, 108, 168, 0.08)',
      }}
    >
      {texto}
    </div>
  );
}