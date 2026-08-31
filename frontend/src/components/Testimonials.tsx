const testimonials = [
  {
    name: 'Pe. André Lima',
    role: 'Coordenador de Pastoral Jovem — Diocese de SP',
    text: 'Usamos o Ecclesio para o nosso retiro anual. O processo foi absurdamente simples — em 15 minutos o evento estava online e as inscrições começaram a chegar.',
    avatar: 'AL',
  },
  {
    name: 'Simone Ferreira',
    role: 'Secretária — Paróquia Nossa Senhora da Graça, RJ',
    text: 'O melhor é que os participantes não precisam criar conta. Isso eliminou metade das dúvidas que recebia antes. Recomendo demais para qualquer paróquia.',
    avatar: 'SF',
  },
  {
    name: 'Josué Carvalho',
    role: 'Coordenador de Eventos — Comunidade Shalom, BH',
    text: 'O painel de gestão é muito prático. Consigo ver quem se inscreveu, quantas vagas restam e editar informações tudo em um lugar só.',
    avatar: 'JC',
  },
]

export function Testimonials() {
  return (
    <section id="depoimentos" className="py-24" style={{ background: '#F5F2E8' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
            >
              Depoimentos
            </span>
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
          </div>
          <h2
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 600, color: '#00186D' }}
          >
            Quem já usa, aprova
          </h2>
          <p className="mt-2 max-w-md mx-auto text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Organizadores de todo o Brasil confiam no Ecclesio para eventos que importam.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map(({ name, role, text, avatar }) => (
            <div
              key={name}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,24,109,0.08)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {/* Ornamento */}
              <div className="h-px w-8" style={{ background: '#D4B16A' }} />

              <p className="text-sm leading-relaxed flex-1" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                "{text}"
              </p>

              <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid rgba(0,24,109,0.06)' }}>
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'rgba(0,24,109,0.08)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
                >
                  {avatar}
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                    {name}
                  </p>
                  <p className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                    {role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
