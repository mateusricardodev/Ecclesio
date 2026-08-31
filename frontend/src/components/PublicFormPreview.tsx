import { MapPin, Users, Clock, ArrowRight, CheckCircle2, Calendar } from 'lucide-react'

export function PublicFormPreview() {
  return (
    <section className="py-24 overflow-hidden" style={{ background: '#F5F2E8' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
            >
              Experiência do participante
            </span>
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
          </div>
          <h2
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 600, color: '#00186D' }}
          >
            O que o inscrito vê
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Uma página limpa, profissional e fácil de usar — sem cadastro, sem complicação.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12 justify-center">
          {/* Mockup — formulário */}
          <div className="relative w-[300px] shrink-0">
            <div className="rounded-[2.5rem] p-2.5 shadow-2xl" style={{ background: '#1C1C1E' }}>
              <div className="rounded-[2rem] overflow-hidden h-[580px] flex flex-col" style={{ background: '#FFFFFF' }}>
                {/* Banner */}
                <div
                  className="h-36 relative flex items-end p-4"
                  style={{ background: '#00186D' }}
                >
                  <div
                    className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(212,177,106,0.2)', color: '#D4B16A', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em' }}
                  >
                    Vagas disponíveis
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)' }}>Paróquia São Pedro — SP</p>
                    <h3 className="font-bold text-base leading-tight" style={{ color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
                      Retiro de Jovens 2025
                    </h3>
                  </div>
                </div>

                {/* Info */}
                <div className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                  {[
                    { Icon: Calendar, text: '14 a 16 de junho de 2025' },
                    { Icon: MapPin,   text: 'Chácara Serra Verde, Atibaia' },
                    { Icon: Clock,    text: 'Saída às 18h de sexta-feira' },
                    { Icon: Users,    text: '13 vagas restantes de 60' },
                  ].map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                      <Icon size={13} style={{ color: '#00186D', opacity: 0.5 }} className="shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>

                {/* Form */}
                <div className="flex-1 px-4 py-3 overflow-hidden flex flex-col gap-2">
                  <p className="text-xs font-semibold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                    Preencha para se inscrever
                  </p>
                  {['Nome completo', 'E-mail', 'CPF', 'Celular'].map((label) => (
                    <div key={label}>
                      <p className="text-xs mb-0.5" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>{label}</p>
                      <div className="h-7 rounded-lg" style={{ background: '#F5F2E8' }} />
                    </div>
                  ))}
                  <button
                    className="mt-1 w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5"
                    style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)' }}
                  >
                    Confirmar inscrição <ArrowRight size={11} />
                  </button>
                  <p className="text-center text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                    Não é necessário criar conta
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup — confirmação */}
          <div className="relative w-[300px] shrink-0">
            <div className="rounded-[2.5rem] p-2.5 shadow-2xl" style={{ background: '#1C1C1E' }}>
              <div
                className="rounded-[2rem] overflow-hidden h-[580px] flex flex-col items-center justify-center px-6 gap-5"
                style={{ background: '#FFFFFF' }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,24,109,0.07)' }}
                >
                  <CheckCircle2 size={38} style={{ color: '#00186D' }} />
                </div>
                <div className="text-center">
                  <h3
                    className="font-bold text-xl mb-1"
                    style={{ fontFamily: 'var(--font-display)', color: '#00186D' }}
                  >
                    Inscrição confirmada!
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                    Sua inscrição foi realizada com sucesso.
                  </p>
                </div>
                <div
                  className="w-full rounded-2xl p-4 flex flex-col gap-2 text-sm"
                  style={{ background: '#F5F2E8', border: '1px solid rgba(0,24,109,0.08)' }}
                >
                  {[
                    { label: 'Evento', value: 'Retiro de Jovens 2025' },
                    { label: 'Nome',   value: 'Maria Silva' },
                    { label: 'Status', value: 'Confirmado', gold: true },
                  ].map(({ label, value, gold }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>{label}</span>
                      <span
                        className="font-semibold text-xs text-right max-w-[140px]"
                        style={{ color: gold ? '#D4B16A' : '#0A0A09', fontFamily: 'var(--font-sans)' }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  Um e-mail de confirmação foi enviado para você.
                </p>
              </div>
            </div>
          </div>

          {/* Texto descritivo */}
          <div className="max-w-sm flex flex-col gap-5">
            <h3
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 600, color: '#00186D' }}
            >
              Simples para quem se inscreve, poderoso para quem organiza.
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              O participante recebe um link, abre no celular e preenche o formulário em menos de 1 minuto.
              Sem downloads, sem cadastros, sem complicação.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'Página com identidade visual do seu evento',
                'Formulário com campos que você define',
                'Confirmação imediata ao se inscrever',
                'Funciona em qualquer celular ou computador',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                  <span style={{ color: '#D4B16A', fontSize: '0.65rem' }}>✦</span>
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
