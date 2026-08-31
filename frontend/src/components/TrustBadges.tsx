import { ShieldCheck, Lock, FileCheck2, ServerCrash, Globe2, BadgeCheck } from 'lucide-react'

const badges = [
  { icon: ShieldCheck, title: 'Proteção de Dados',       description: 'Dados dos participantes armazenados com segurança e sem compartilhamento.' },
  { icon: Lock,        title: 'Conexão Segura',          description: 'Toda comunicação é criptografada via HTTPS.' },
  { icon: FileCheck2,  title: 'Conformidade LGPD',       description: 'Plataforma desenvolvida seguindo as diretrizes da LGPD.' },
  { icon: ServerCrash, title: 'Alta Disponibilidade',    description: 'Infraestrutura estável para que seu evento esteja sempre acessível.' },
  { icon: Globe2,      title: 'Acesso Universal',        description: 'Funciona em qualquer dispositivo, sem instalação ou conta para participantes.' },
  { icon: BadgeCheck,  title: 'Plataforma Confiável',    description: 'Desenvolvida especialmente para eventos católicos e comunitários.' },
]

export function TrustBadges() {
  return (
    <section className="py-20" style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,24,109,0.06)', borderBottom: '1px solid rgba(0,24,109,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
            >
              Segurança & Confiança
            </span>
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
          </div>
          <h2
            style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: '#00186D' }}
          >
            Seus dados estão seguros
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-5 rounded-2xl transition-all"
              style={{
                background: '#FAFAFA',
                border: '1px solid rgba(0,24,109,0.07)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,24,109,0.06)' }}
              >
                <Icon size={17} style={{ color: '#00186D' }} />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                  {title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
