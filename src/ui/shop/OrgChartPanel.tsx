import type { GameSnapshot } from '@/core/types';
import { shopRu } from '@/content/shopRu';
import { isManagerRole } from '@/domain/org/Employee';

export interface OrgChartPanelProps {
  state: GameSnapshot;
}

export function OrgChartPanel({ state }: OrgChartPanelProps) {
  const copy = shopRu;
  const hero = 'Герой (директор)';
  const managers = state.org.employees.filter((e) => isManagerRole(e.roleId));
  const workers = state.org.employees.filter((e) => !isManagerRole(e.roleId));
  const underManager = new Set<string>();
  for (const m of managers) {
    for (const w of workers) {
      const viaManager = w.managerId === m.id;
      const viaBrigade =
        !!w.brigadeId &&
        state.org.brigades.find((b) => b.id === w.brigadeId)?.leaderId === m.id;
      if (viaManager || viaBrigade) underManager.add(w.id);
    }
  }
  const unassigned = workers.filter((w) => !underManager.has(w.id));

  return (
    <div className="shop-list">
      <h3>{copy.orgTitle}</h3>
      <div className="org-tree">
        <div>{hero}</div>
        <ul>
          {managers.map((m) => (
            <li key={m.id}>
              {m.name} · {m.roleId} → {m.zoneId ?? '—'}
              <ul>
                {workers
                  .filter((w) => underManager.has(w.id) && (
                    w.managerId === m.id ||
                    (!!w.brigadeId &&
                      state.org.brigades.find((b) => b.id === w.brigadeId)?.leaderId === m.id)
                  ))
                  .map((w) => (
                    <li key={w.id}>
                      {w.name} · {w.zoneId ?? '—'}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
          {unassigned.map((w) => (
            <li key={w.id}>
              {w.name} · {w.zoneId ?? 'не назначен'} (без руководителя)
            </li>
          ))}
        </ul>
      </div>
      <h3>{copy.journalTitle}</h3>
      <div className="journal-list">
        {state.events
          .slice(-12)
          .reverse()
          .map((e) => (
            <div key={e.id}>
              [{e.gameTime.toFixed(0)}s] {e.message}
            </div>
          ))}
      </div>
      {state.org.escalations.length > 0 && (
        <p className="shop-card__block">
          Эскалации герою: {state.org.escalations.length}
        </p>
      )}
    </div>
  );
}
