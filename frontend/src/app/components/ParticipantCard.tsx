import { Check, RotateCcw } from 'lucide-react'
import type { CheckinParticipant } from '../api'
import { formatRegistrationStatus } from '../format'

interface ParticipantCardProps {
  participant: CheckinParticipant
  busy?: boolean
  onCheckIn: () => void
  onUndo: () => void
  onViewData?: () => void
}

export function ParticipantCard({
  participant: p,
  busy,
  onCheckIn,
  onUndo,
  onViewData,
}: ParticipantCardProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      {/* Selo de credenciado (verde do painel), só quando já fez check-in. */}
      {p.checkedIn && (
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ecc-green">
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-snug text-ecc-ink">
          {p.name}
        </p>

        <div className="mt-1.5 flex flex-col gap-0.5">
          <MetaLine label="CPF" value={p.cpf} />
          <MetaLine label="Inscrição" value={p.code} />
          <MetaLine label="Status" value={formatRegistrationStatus(p.status)} />
        </div>

        <button
          onClick={onViewData}
          className="mt-2 text-[13px] font-bold text-ecc-navy active:opacity-70"
        >
          Ver dados
        </button>
      </div>

      {/* Coluna de ação com largura fixa: o rótulo quebra em duas linhas em vez
          de espremer o nome e o CPF, que são o que o voluntário precisa ler. */}
      <div className="w-[108px] shrink-0 pt-0.5">
        {p.checkedIn ? (
          <button
            onClick={onUndo}
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-ecc-navy/20 px-2 py-2.5 text-center text-[12px] font-semibold leading-tight text-ecc-navy transition-colors active:bg-ecc-navy/5 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            Desfazer Check-in
          </button>
        ) : (
          <button
            onClick={onCheckIn}
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-ecc-navy px-2 py-2.5 text-center text-[12px] font-semibold leading-tight text-white  transition-colors active:bg-ecc-navy-deep disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
            Fazer Check-in
          </button>
        )}
      </div>
    </div>
  )
}

function MetaLine({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="truncate text-[13px] text-ecc-muted">
      <span className="text-ecc-faint">{label}: </span>
      {value ?? '-'}
    </p>
  )
}
