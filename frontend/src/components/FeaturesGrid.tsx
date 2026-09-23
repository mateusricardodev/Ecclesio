import { UserPlus, Settings2, Share2, LayoutDashboard, Zap, ShieldCheck, Smartphone, Users } from 'lucide-react'

const steps = [
  {
    step: '01',
    icon: UserPlus,
    title: 'Crie sua conta',
    description: 'Cadastro rápido para o organizador. Em menos de 2 minutos você já está pronto para criar seu primeiro evento.',
  },
  {
    step: '02',
    icon: Settings2,
    title: 'Configure o evento',
    description: 'Use nosso wizard intuitivo para definir informações, formulário de inscrição, banner e página pública.',
  },
  {
    step: '03',
    icon: Share2,
    title: 'Compartilhe o link',
    description: 'Publique o evento e compartilhe o link com sua comunidade. Participantes se inscrevem sem criar conta.',
  },
  {
    step: '04',
    icon: LayoutDashboard,
    title: 'Gerencie os inscritos',
    description: 'Acompanhe inscrições em tempo real, filtre por status, edite dados e controle as vagas disponíveis.',
  },
]

const differentials = [
  {
    icon: Zap,
    title: 'Sem burocracia para o participante',
    description: 'Nenhuma conta necessária. O participante abre o link e já está no formulário.',
  },
  {
    icon: ShieldCheck,
    title: 'Controle total de vagas',
    description: 'Defina o número máximo de inscritos e o sistema fecha automaticamente quando a capacidade é atingida.',
  },
  {
    icon: Smartphone,
    title: 'Responsivo para celular',
    description: 'Página de inscrição totalmente otimizada para mobile. Seu público se inscreve de qualquer dispositivo.',
  },
  {
    icon: Users,
    title: 'Painel completo de gestão',
    description: 'Visualize, filtre e edite cada inscrição. Busca global para encontrar qualquer participante em segundos.',
  },
]

const features = [
  {
    icon: LayoutDashboard,
    title: 'Gestão completa',
    description: 'Organize eventos, atividades e inscrições em um só lugar.',
  },
  {
    icon: Users,
    title: 'Experiência para todos',
    description: 'Uma interface simples e clara para organizadores e participantes.',
  },
  {
    icon: Zap,
    title: 'Pagamentos integrados',
    description: 'Receba pagamentos online com segurança e facilidade.',
  },
  {
    icon: ShieldCheck,
    title: 'Relatórios & insights',
    description: 'Acompanhe presenças, inscrições e resultados em tempo real.',
  },
]

export function FeaturesGrid() {
  return (
    <>
      {/* Cards de recursos (logo abaixo do hero) */}
      <section style={{ background: '#F5F2E8' }} className="pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl p-6 transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,24,109,0.08)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(0,24,109,0.06)' }}
                >
                  <Icon size={18} style={{ color: '#00186D' }} />
                </div>
                <h3
                  className="font-semibold mb-1.5 text-sm"
                  style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
                >
                  {title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24" style={{ background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8" style={{ background: '#D4B16A' }} />
              <span
                className="text-xs font-semibold tracking-[0.15em] uppercase"
                style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
              >
                Simples assim
              </span>
              <div className="h-px w-8" style={{ background: '#D4B16A' }} />
            </div>
            <h2
              style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 600, color: '#00186D' }}
            >
              Como funciona
            </h2>
            <p className="mt-2 max-w-md mx-auto text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Do cadastro ao primeiro inscrito em menos de 10 minutos.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map(({ step, icon: Icon, title, description }) => (
              <div
                key={step}
                className="relative rounded-2xl p-6 transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,24,109,0.08)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0,24,109,0.06)' }}
                  >
                    <Icon size={20} style={{ color: '#00186D' }} />
                  </div>
                  <span
                    className="font-bold select-none"
                    style={{ color: 'rgba(0,24,109,0.08)', fontSize: '2.25rem', fontFamily: 'var(--font-sans)', lineHeight: 1 }}
                  >
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold mb-1.5 text-sm" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                  {title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section id="diferenciais" className="py-24" style={{ background: '#00186D' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8" style={{ background: '#D4B16A' }} />
              <span
                className="text-xs font-semibold tracking-[0.15em] uppercase"
                style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
              >
                Por que escolher
              </span>
              <div className="h-px w-8" style={{ background: '#D4B16A' }} />
            </div>
            <h2
              style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 600, color: '#FFFFFF' }}
            >
              Pensado para ministérios
            </h2>
            <p className="mt-2 max-w-md mx-auto text-sm" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)' }}>
              Cada funcionalidade foi desenhada para a realidade de quem organiza eventos em igrejas e comunidades.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {differentials.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl p-6 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(212,177,106,0.15)' }}
                >
                  <Icon size={18} style={{ color: '#D4B16A' }} />
                </div>
                <h3 className="font-semibold mb-1.5 text-sm" style={{ color: '#FFFFFF', fontFamily: 'var(--font-sans)' }}>
                  {title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sans)' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
