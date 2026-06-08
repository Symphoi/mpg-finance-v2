'use client';
import { Check } from 'lucide-react';

interface Step {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  steps: Step[];
  current: string;
  rejected?: boolean;
  rejectedKey?: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  submitted:        '#d97706',
  processing:       '#2563eb',
  ready_to_invoice: '#7c3aed',
  shipped:          '#0891b2',
  delivered:        '#059669',
  completed:        '#059669',
  approved_spv:     '#2563eb',
  approved_finance: '#7c3aed',
  paid:             '#059669',
  approved:         '#059669',
  active:           '#7c3aed',
  in_settlement:    '#0891b2',
  fully_used:       '#059669',
  created:          '#2563eb',
};

export default function StatusProgress({ steps, current, rejected, rejectedKey }: Props) {
  const currentIdx = steps.findIndex((s) => s.key === current);
  const isRejected = rejected || current === 'rejected' || current === 'cancelled';

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isDone    = i < currentIdx;
        const isActive  = step.key === current;
        const isReject  = isRejected && (rejectedKey ? step.key === rejectedKey : isActive);
        const color     = step.color ?? DEFAULT_COLORS[step.key] ?? '#6b7280';

        return (
          <div key={step.key} className="flex items-center">
            {/* connector line */}
            {i > 0 && (
              <div
                className="h-0.5 w-8"
                style={{ background: isDone ? color : '#e5e7eb' }}
              />
            )}
            {/* step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                style={{
                  background: isReject  ? '#fee2e2'
                            : isDone    ? color
                            : isActive  ? color
                            : '#f3f4f6',
                  color:      isReject  ? '#dc2626'
                            : isDone    ? '#fff'
                            : isActive  ? '#fff'
                            : '#9ca3af',
                  border:     isActive  ? `2px solid ${color}` : '2px solid transparent',
                  boxShadow:  isActive  ? `0 0 0 3px ${color}22` : 'none',
                }}
              >
                {isDone   ? <Check size={12} strokeWidth={3} /> :
                 isReject ? '✕' : i + 1}
              </div>
              <div
                className="text-[10px] font-medium whitespace-nowrap"
                style={{ color: isActive ? color : isDone ? color : '#9ca3af' }}
              >
                {step.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Predefined step sets ──────────────────────────────────────

export const SO_STEPS: Step[] = [
  { key: 'submitted',   label: 'Submitted' },
  { key: 'processing',  label: 'Processing' },
  { key: 'invoicing',   label: 'Invoicing' },
  { key: 'completed',   label: 'Completed' },
];

export const PO_STEPS: Step[] = [
  { key: 'submitted',    label: 'Submitted' },
  { key: 'approved_spv', label: 'Approved SPV' },
  { key: 'approved',     label: 'Approved Finance' },
  { key: 'paid',         label: 'Dibayar' },
];

export const CA_STEPS: Step[] = [
  { key: 'submitted',     label: 'Diajukan' },
  { key: 'approved',      label: 'Disetujui' },
  { key: 'active',        label: 'Aktif' },
  { key: 'in_settlement', label: 'Settlement' },
  { key: 'completed',     label: 'Selesai' },
];

export const REIMBURSE_STEPS: Step[] = [
  { key: 'submitted', label: 'Diajukan' },
  { key: 'approved',  label: 'Disetujui' },
];

export const DO_STEPS: Step[] = [
  { key: 'shipping',  label: 'Dikirim' },
  { key: 'delivered', label: 'Diterima' },
];