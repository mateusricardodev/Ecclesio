import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const items = [
  {
    q: 'A plataforma é gratuita?',
    a: 'Sim. Você pode criar sua conta e gerenciar seus eventos sem nenhum custo. Nossa missão é tornar a gestão de eventos acessível para qualquer ministério ou comunidade.',
  },
  {
    q: 'O participante precisa criar uma conta para se inscrever?',
    a: 'Não. Esse é um dos principais diferenciais da plataforma. O participante recebe o link do evento, preenche o formulário e confirma a inscrição sem criar conta ou senha.',
  },
  {
    q: 'Posso personalizar os campos do formulário de inscrição?',
    a: 'Sim. Durante a criação do evento, você escolhe quais informações deseja coletar: nome, e-mail, CPF, celular, data de nascimento, endereço, entre outros campos opcionais.',
  },
  {
    q: 'Como funciona o controle de vagas?',
    a: 'Você define o número máximo de participantes ao criar o evento. O sistema conta automaticamente as inscrições e encerra novas inscrições ao atingir a capacidade máxima.',
  },
  {
    q: 'Consigo ver e gerenciar todos os inscritos?',
    a: 'Sim. O painel do organizador exibe todos os inscritos em tempo real, com filtros por status, busca por nome ou CPF e a possibilidade de editar ou cancelar inscrições individualmente.',
  },
  {
    q: 'Meus dados e os dos participantes estão seguros?',
    a: 'Sim. A plataforma foi desenvolvida seguindo boas práticas de segurança e conformidade com a LGPD. Nenhum dado é compartilhado com terceiros.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(0,24,109,0.1)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: open ? 'rgba(0,24,109,0.03)' : '#FFFFFF' }}
      >
        <span className="font-medium text-sm pr-4" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
          {q}
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform duration-300"
          style={{
            color: open ? '#D4B16A' : '#6B7280',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48' : 'max-h-0'}`}>
        <p
          className="px-5 pb-4 pt-3 text-sm leading-relaxed"
          style={{
            color: '#6B7280',
            fontFamily: 'var(--font-sans)',
            borderTop: '1px solid rgba(0,24,109,0.06)',
          }}
        >
          {a}
        </p>
      </div>
    </div>
  )
}

export function FAQ() {
  return (
    <section className="py-24" style={{ background: '#FFFFFF' }}>
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
            <span
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
            >
              Dúvidas frequentes
            </span>
            <div className="h-px w-8" style={{ background: '#D4B16A' }} />
          </div>
          <h2
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 600, color: '#00186D' }}
          >
            Perguntas e respostas
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Não encontrou sua dúvida? Entre em contato com nossa equipe.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <FAQItem key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
