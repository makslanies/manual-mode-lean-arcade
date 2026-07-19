import { useState } from 'react';
import type { GameSnapshot } from '@/core/types';
import { shopRu } from '@/content/shopRu';

const ZONES = [
  { id: 'machine', label: 'Станок' },
  { id: 'hopper', label: 'Бункер сырья' },
  { id: 'press', label: 'Пресс' },
  { id: 'worker', label: 'Сборка' },
  { id: 'fridge', label: 'Склад-холод' },
  { id: 'dock', label: 'Док' },
  { id: 'power', label: 'Энергощит' },
];

function defaultZoneForRole(roleId: string): string {
  switch (roleId) {
    case 'material_handler':
    case 'forklift_driver':
      return 'hopper';
    case 'assembler':
      return 'worker';
    case 'mechanic':
    case 'operator':
      return 'machine';
    case 'shift_lead':
      return 'worker';
    default:
      return 'machine';
  }
}

export interface HireAssignPanelProps {
  state: GameSnapshot;
  employeeId: string;
  onAssign: (zoneId: string) => void;
  onCancel: () => void;
}

export function HireAssignPanel({ state, employeeId, onAssign, onCancel }: HireAssignPanelProps) {
  const copy = shopRu;
  const emp = state.org.employees.find((e) => e.id === employeeId);
  const [zoneId, setZoneId] = useState(
    () => emp?.zoneId ?? defaultZoneForRole(emp?.roleId ?? 'operator'),
  );
  if (!emp) return null;

  const brigades = state.org.brigades.filter((b) => b.zoneId === zoneId);

  return (
    <div className="hire-form">
      <h3>{copy.hireTitle}</h3>
      <p>
        <strong>{emp.name}</strong> · {emp.roleId}
      </p>
      <label>
        {copy.zoneLabel}
        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
      </label>
      {brigades.length > 0 && (
        <p className="shop-card__meta">
          {copy.brigadeLabel}: {brigades.map((b) => b.name).join(', ')}
        </p>
      )}
      <div className="shop-subnav">
        <button type="button" className="btn" onClick={() => onAssign(zoneId)}>
          {copy.assignBtn}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {copy.closeBtn}
        </button>
      </div>
    </div>
  );
}
