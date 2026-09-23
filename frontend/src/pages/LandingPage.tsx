import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, Users, QrCode, Wallet, Check, X, Plus, Minus, ArrowUpRight,
} from 'lucide-react'
import { LandingNavbar } from '../components/LandingNavbar'
import { Footer } from '../components/Footer'

const BENEFITS = [
  {
    icon: ClipboardList,
    title: 'Inscrição sem cadastro',
    text: 'O participante abre o link, preenche o formulário com os campos que você escolheu e pronto. Não precisa criar conta nem senha.',
  },
  {
    icon: Users,
    title: 'Vagas sob controle',
    text: 'Defina o limite de inscritos. As inscrições fecham sozinhas quando o evento lota, sem planilha paralela.',
  },
  {
    icon: Wallet,
    title: 'Pagamento por PIX',
    text: 'Cobrança via Mercado Pago com confirmação automática. O valor entra na sua carteira e você resgata para a sua chave PIX.',
  },
  {
    icon: QrCode,
    title: 'Check-in por QR code',
    text: 'Cada inscrito recebe um ingresso com QR code. A equipe credencia pelo celular, mesmo com fila na porta.',
  },
]

const ORGANIZER_POINTS = [
  'Lista de inscritos atualizada na hora, com busca por nome ou CPF.',
  'Edição, cancelamento e reenvio do e-mail de confirmação em um clique.',
  'Exportação da lista em planilha para a secretaria.',
  'Pesquisa de satisfação enviada aos participantes depois do evento.',
]

const COMPARISON = [
  { label: 'Inscrição pelo celular, sem criar conta', ecclesio: true, manual: false },
  { label: 'Limite de vagas automático', ecclesio: true, manual: false },
  { label: 'Pagamento conferido sem comprovante', ecclesio: true, manual: false },
  { label: 'Ingresso com QR code por e-mail', ecclesio: true, manual: false },
  { label: 'Lista única para toda a equipe', ecclesio: true, manual: false },
  { label: 'Dados protegidos conforme a LGPD', ecclesio: true, manual: false },
]

const STEPS = [
  {
    title: 'Crie o evento',
    text: 'Informe data, local e vagas, escolha as formas de pagamento e os campos do formulário.',
  },
  {
    title: 'Compartilhe o link',
    text: 'Envie a página do evento no grupo da comunidade. As inscrições chegam direto no painel.',
  },
  {
    title: 'Credencie na entrada',
    text: 'No dia, a equipe lê o QR code de cada participante e acompanha quem já chegou.',
  },
]

const FAQ = [
  {
    q: 'Quanto custa?',
    a: 'Criar a conta e publicar eventos gratuitos não tem custo. Em inscrições pagas online, a plataforma cobra uma taxa de serviço somada ao valor da inscrição, e o organizador recebe o valor integral que definiu. Pagamentos em dinheiro não têm taxa.',
  },
  {
    q: 'O participante precisa criar uma conta?',
    a: 'Não. Ele recebe o link do evento, preenche o formulário e confirma a inscrição sem criar conta ou senha.',
  },
  {
    q: 'Posso escolher os campos do formulário?',
    a: 'Sim. Além de nome, e-mail e CPF, você ativa só o que precisa: data de nascimento, endereço, contato do responsável, uso de medicamentos e autorização de responsável.',
  },
  {
    q: 'Como recebo o dinheiro das inscrições?',
    a: 'Os pagamentos confirmados entram na carteira do evento. Depois do prazo de retenção, você pede o resgate para a sua chave PIX.',
  },
  {
    q: 'E os dados dos participantes?',
    a: 'Cada organizador vê apenas os inscritos dos próprios eventos. Os dados são usados para a organização do evento, como descrito na política de privacidade.',
  },
]

function Eyebrow({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <p className={`ecc-eyebrow ${center ? 'text-center' : ''}`}>{children}</p>
}

function Heading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`ecc-display text-[44px] sm:text-[60px] ${className}`}>
      {children}
    </h2>
  )
}

function HeroScreen() {
  // Reprodução simplificada do formulário público de inscrição.
  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="bg-ecc-navy px-6 sm:px-10 py-6 sm:py-8">
        <p className="ecc-eyebrow" style={{ color: '#D4B16A' }}>Inscrição</p>
        <p className="font-[family-name:var(--font-display)] text-white text-[26px] sm:text-[36px] leading-none mt-2">
          Retiro de Jovens
        </p>
        <p className="text-white/60 text-xs sm:text-sm mt-2">Sábado, 14 de março · Casa de retiros</p>
      </div>
      <div className="flex-1 grid sm:grid-cols-2 gap-3 sm:gap-4 p-6 sm:p-10 content-start">
        {['Nome completo', 'E-mail', 'CPF', 'Celular'].map((label) => (
          <div key={label} className="flex flex-col gap-1.5">
            <span className="text-[11px] sm:text-xs font-medium text-ecc-ink">{label}</span>
            <span className="h-9 sm:h-10 rounded-xl border border-ecc-line" />
          </div>
        ))}
        <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-ecc-navy px-4 py-3 mt-1">
          <span className="text-xs sm:text-sm font-medium text-ecc-navy">PIX</span>
          <span className="text-xs sm:text-sm font-bold text-ecc-navy">R$ 120,00</span>
        </div>
        <span className="sm:col-span-2 ecc-btn ecc-btn-primary mt-1">Confirmar inscrição</span>
      </div>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-ecc-line">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-6 py-6 text-left"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-[22px] sm:text-[26px] leading-tight text-ecc-ink">
          {q}
        </span>
        {open ? <Minus size={18} className="shrink-0 text-ecc-navy" /> : <Plus size={18} className="shrink-0 text-ecc-navy" />}
      </button>
      {open && <p className="ecc-paragraph pb-6 pr-10 max-w-2xl">{a}</p>}
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-10">
        {/* Header */}
        <header className="pt-[120px] sm:pt-[148px] flex flex-col gap-16 sm:gap-[120px]">
          <div className="flex flex-col items-center gap-8 text-center">
            <h1 className="ecc-display text-[60px] sm:text-[104px] lg:text-[148px]">
              Do convite ao <span className="whitespace-nowrap">check-in.</span>
            </h1>
            <p className="ecc-paragraph max-w-xl">
              O Ecclesio organiza as inscrições dos eventos da sua paróquia ou comunidade: formulário,
              pagamento por PIX, lista de inscritos e credenciamento na entrada.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link to="/login?modo=cadastro" className="ecc-btn ecc-btn-primary">
                Criar conta <ArrowUpRight size={14} />
              </Link>
              <a href="#como-funciona" className="ecc-btn ecc-btn-soft">Como funciona</a>
            </div>
          </div>

          <div className="relative rounded-[30px] bg-ecc-navy h-[300px] sm:h-[362px]">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[80%] max-w-[907px] h-[420px] sm:h-[560px] rounded-[24px] bg-black p-2.5 sm:p-4 border-2 border-b-0 border-white/50"
              style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}
            >
              <div className="w-full h-full rounded-[16px] overflow-hidden">
                <HeroScreen />
              </div>
            </div>
          </div>
        </header>

        <main className="pt-[160px] sm:pt-[240px]">
          {/* Recursos */}
          <section id="recursos" className="scroll-mt-24 pb-[120px]">
            <div className="border-t border-ecc-line pt-20 pb-14 flex flex-col gap-12">
              <div className="flex flex-col gap-10 lg:pr-[400px]">
                <Eyebrow>Recursos</Eyebrow>
                <Heading>Tudo que o evento precisa, num lugar só.</Heading>
                <p className="ecc-paragraph">Menos mensagens no grupo, menos planilha e nenhum comprovante perdido.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-10">
                {BENEFITS.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="border-t border-ecc-line pt-10 pb-6 pr-5 flex flex-col gap-6">
                    <Icon size={24} strokeWidth={1.5} className="text-ecc-navy" />
                    <div className="flex flex-col gap-5">
                      <h3 className="font-[family-name:var(--font-display)] text-[20px] leading-none text-ecc-ink">{title}</h3>
                      <p className="ecc-paragraph">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[360px] sm:h-[620px] rounded-[30px] overflow-hidden">
              <img src="/interior-igreja.jpg" alt="Interior de uma igreja com bancos de madeira" className="w-full h-full object-cover" />
            </div>
          </section>

          {/* Para o organizador */}
          <section className="pb-[120px] grid lg:grid-cols-2 gap-5">
            <div className="border-t border-ecc-line pt-14 pb-10 lg:pb-20 flex flex-col gap-10">
              <div className="flex flex-col gap-10 lg:pr-20">
                <Heading>Para quem organiza</Heading>
                <p className="ecc-paragraph">
                  O painel mostra quem se inscreveu, quem pagou e quantas vagas restam. A equipe inteira trabalha
                  na mesma lista.
                </p>
              </div>
              <ol className="flex flex-col">
                {ORGANIZER_POINTS.map((point, i) => (
                  <li key={point} className="border-t border-ecc-line py-5 lg:pr-20 flex gap-8 text-[15px] leading-[1.4]">
                    <span className="font-bold text-ecc-text">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-ecc-ink">{point}</span>
                  </li>
                ))}
              </ol>
              <Link to="/login?modo=cadastro" className="ecc-btn ecc-btn-soft self-start">Começar agora</Link>
            </div>
            <div className="rounded-[30px] bg-ecc-cream min-h-[480px] lg:min-h-[711px] flex items-center justify-center p-6 sm:p-10">
              {/* Cartão de inscrito, como aparece no app de credenciamento. */}
              <div className="w-full max-w-sm rounded-[20px] bg-white border border-ecc-line p-7 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <p className="ecc-eyebrow">Credenciamento</p>
                  <span className="rounded-full bg-ecc-navy-soft text-ecc-navy text-xs font-bold px-3 py-1">Confirmada</span>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[32px] leading-none">Ana Beatriz Souza</p>
                  <p className="ecc-paragraph mt-2">Retiro de Jovens</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-ecc-line pt-5">
                  <div>
                    <p className="ecc-eyebrow text-ecc-text" style={{ color: '#6F6F6F' }}>Código</p>
                    <p className="font-[family-name:var(--font-mono)] text-sm mt-1">RJ-4821</p>
                  </div>
                  <div>
                    <p className="ecc-eyebrow" style={{ color: '#6F6F6F' }}>Pagamento</p>
                    <p className="text-sm font-medium mt-1">PIX</p>
                  </div>
                </div>
                <span className="ecc-btn ecc-btn-primary">Fazer check-in</span>
              </div>
            </div>
          </section>

          {/* Comparativo */}
          <section id="comparativo" className="scroll-mt-24 pb-[120px] flex flex-col gap-5">
            <div className="border-t border-ecc-faint py-20 flex flex-col items-center gap-10 text-center lg:px-[240px]">
              <Eyebrow center>Comparativo</Eyebrow>
              <Heading>Por que sair da planilha?</Heading>
              <p className="ecc-paragraph">
                Formulário genérico, planilha e conferência de comprovante no grupo funcionam até o evento crescer.
                Veja o que muda.
              </p>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[560px] grid grid-cols-2 rounded-[20px]">
                <div className="bg-white border border-ecc-line rounded-[20px] overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <div className="h-24 flex items-center justify-center border-b border-ecc-faint">
                    <img src="/logo-horizontal.png" alt="Ecclesio" className="h-9 object-contain" />
                  </div>
                  {COMPARISON.map((row) => (
                    <div key={row.label} className="flex items-center gap-2 px-6 sm:px-8 py-7 border-b border-ecc-line last:border-b-0">
                      <Check size={14} className="text-ecc-navy shrink-0" />
                      <span className="font-[family-name:var(--font-mono)] text-xs text-ecc-ink">{row.label}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="h-24 flex items-center justify-center border-b border-ecc-faint">
                    <span className="text-[22px] font-medium text-ecc-text tracking-tight">Planilha e grupo</span>
                  </div>
                  {COMPARISON.map((row) => (
                    <div key={row.label} className="flex items-center gap-2 px-6 sm:px-8 py-7 border-b border-l border-ecc-line last:border-b-0">
                      <X size={14} className="text-ecc-faint shrink-0" />
                      <span className="font-[family-name:var(--font-mono)] text-xs text-ecc-text">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Missão */}
          <section className="pb-[120px] grid lg:grid-cols-2 gap-5">
            <div className="rounded-[30px] overflow-hidden aspect-[550/624] bg-ecc-cream flex items-center justify-center">
              <img src="/logo-mark.png" alt="" className="w-[38%] max-w-[220px] object-contain" />
            </div>
            <div className="border-t border-ecc-line lg:pl-12 pt-10 flex flex-col justify-center gap-12">
              <p className="font-[family-name:var(--font-display)] text-[30px] sm:text-[40px] leading-none text-ecc-ink" style={{ letterSpacing: '-0.04em' }}>
                A equipe de um retiro, de um encontro ou de uma missa campal deveria gastar o tempo com as pessoas,
                e não conferindo lista e comprovante. O Ecclesio existe para cuidar dessa parte.
              </p>
              <div className="flex flex-col gap-2">
                <p className="text-[15px] text-ecc-ink">Ecclesio</p>
                <p className="ecc-eyebrow">Feito para a missão da Igreja</p>
              </div>
            </div>
          </section>

          {/* Como funciona */}
          <section id="como-funciona" className="scroll-mt-24 border-t border-ecc-line pt-20 pb-[120px] flex flex-col gap-20">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <Heading>Como funciona</Heading>
              <Link to="/login?modo=cadastro" className="ecc-btn ecc-btn-soft">Criar meu evento</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {STEPS.map((step, i) => (
                <div key={step.title} className="border-t border-ecc-line pt-14 pb-5 pr-8 flex flex-col gap-14">
                  <p className="text-[80px] leading-none text-ecc-faint" style={{ letterSpacing: '-0.04em' }}>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <div className="flex flex-col gap-5">
                    <h3 className="font-[family-name:var(--font-display)] text-[20px] leading-none text-ecc-ink">{step.title}</h3>
                    <p className="ecc-paragraph">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dúvidas */}
          <section id="duvidas" className="scroll-mt-24 pb-[120px] grid lg:grid-cols-[1fr_1.4fr] gap-10">
            <div className="flex flex-col gap-10">
              <Eyebrow>Dúvidas</Eyebrow>
              <Heading>Perguntas frequentes</Heading>
            </div>
            <div className="border-b border-ecc-line">
              {FAQ.map((item) => <FaqItem key={item.q} {...item} />)}
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-ecc-line py-[120px] flex flex-col items-center gap-10 text-center max-w-[600px] mx-auto">
            <Heading>Seu próximo evento começa aqui</Heading>
            <p className="ecc-paragraph">Crie a conta, monte a página do evento e compartilhe o link com a comunidade.</p>
            <Link to="/login?modo=cadastro" className="ecc-btn ecc-btn-primary w-full">
              Criar conta <ArrowUpRight size={14} />
            </Link>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}
