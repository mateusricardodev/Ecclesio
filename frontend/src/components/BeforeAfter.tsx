import { X, Check } from 'lucide-react'

const before = [
  'Formulário no Google Forms desconexo do evento',
  'Planilha Excel para controlar inscritos manualmente',
  'Link de inscrição confuso e sem identidade visual',
  'Participante liga perguntando se foi inscrito',
  'Dificuldade de saber quantas vagas restam',
  'Sem controle de capacidade, o evento superlota',
]

const after = [
  'Formulário integrado, personalizado e com sua marca',
  'Painel em tempo real com todos os inscritos',
  'Página pública profissional com banner e detalhes',
  'Confirmação automática ao completar inscrição',
  'Contador de vagas atualizado instantaneamente',
  'Inscrições encerram automaticamente ao atingir limite',
]

export function BeforeAfter() {
  return (
    <section className="py-24" style={{ background: '#F5F2E8' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
            >
              Comparativo
            </span>
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
          </div>
          <h2
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 600, color: '#00186D' }}
          >
            A diferença na prática
          </h2>
          <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Chega de improvisar com ferramentas que não foram feitas para isso.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Antes */}
          <div
            className="rounded-2xl p-6"
            style={{ background: '#FFFFFF', border: '1px solid rgba(239,68,68,0.15)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.08)' }}
              >
                <X size={16} style={{ color: '#EF4444' }} />
              </span>
              <span className="font-semibold text-sm" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>Sem a plataforma</span>
            </div>
            <ul className="flex flex-col gap-3">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  <X size={14} className="mt-0.5 shrink-0" style={{ color: '#EF4444' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Depois */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,24,109,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <span
              className="absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'rgba(0,24,109,0.08)', color: '#00186D', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em' }}
            >
              Ecclesio
            </span>
            <div className="flex items-center gap-2 mb-5">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,24,109,0.06)' }}
              >
                <Check size={16} style={{ color: '#00186D' }} />
              </span>
              <span className="font-semibold text-sm" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>Com o Ecclesio</span>
            </div>
            <ul className="flex flex-col gap-3">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                  <Check size={14} className="mt-0.5 shrink-0" style={{ color: '#D4B16A' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
