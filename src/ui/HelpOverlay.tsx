import { useEffect } from 'react';
import { helpRu } from '@/content/helpRu';

export interface HelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function HelpOverlay({ open, onClose }: HelpOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?' || e.key === '/') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const t = helpRu;

  return (
    <div
      className="help-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-heading"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="help-panel">
        <header className="help-panel__header">
          <h2 id="help-heading" className="help-panel__title">
            {t.title}
          </h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t.closeBtn}
          </button>
        </header>
        <div className="help-panel__body">
          {t.sections.map((section) => (
            <section key={section.title} className="help-section">
              <h3>{section.title}</h3>
              {section.body.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="help-fab"
      onClick={onClick}
      title={helpRu.openLabel}
      aria-label={helpRu.openLabel}
    >
      ?
    </button>
  );
}
