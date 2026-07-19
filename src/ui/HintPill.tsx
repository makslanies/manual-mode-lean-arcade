export interface HintPillProps {
  text: string;
  visible: boolean;
}

export function HintPill({ text, visible }: HintPillProps) {
  return (
    <div
      className={`hint-pill${visible ? ' hint-pill--visible' : ''}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      {text}
    </div>
  );
}
