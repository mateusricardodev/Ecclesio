import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LandingNavbar } from '../components/LandingNavbar'
import { Footer } from '../components/Footer'

const CONTACT_NAME  = 'Mateus Ricardo'
const CONTACT_EMAIL = 'mateus.ricardo761919@gmail.com'
const LAST_UPDATED  = '23 de setembro de 2026'

const h2Style: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.5rem',
  fontWeight: 600,
  color: '#00186D',
  marginTop: '2.5rem',
  marginBottom: '0.75rem',
}

const textStyle: React.CSSProperties = {
  color: '#33425C',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.95rem',
  lineHeight: 1.75,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={h2Style}>{title}</h2>
      <div className="flex flex-col gap-3" style={textStyle}>{children}</div>
    </section>
  )
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1.5">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export function PrivacyPolicy() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const mail = <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00186D', textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>
      <LandingNavbar />
      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
          >
            Última atualização: {LAST_UPDATED}
          </p>
          <h1
            className="mt-2"
            style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 600, color: '#00186D', lineHeight: 1.15 }}
          >
            Política de Privacidade
          </h1>
          <p className="mt-4" style={textStyle}>
            Esta política explica quais dados pessoais o Ecclesio coleta, para que são usados, com quem são
            compartilhados e como você pode exercer os seus direitos, conforme a Lei Geral de Proteção de Dados
            Pessoais (LGPD, Lei nº 13.709/2018).
          </p>

          <Section title="1. Quem somos">
            <p>
              O Ecclesio é uma plataforma de gestão de eventos e inscrições para igrejas e comunidades. O responsável
              pela plataforma é {CONTACT_NAME}, que pode ser contatado pelo e-mail {mail}.
            </p>
            <p>
              Quando você se inscreve em um evento, quem decide quais dados pedir e como usá-los na organização do
              evento é o <strong>organizador</strong> (a paróquia, comunidade ou pessoa que criou o evento). Nesse
              caso o organizador é o controlador dos seus dados e o Ecclesio atua como operador, tratando-os em nome
              dele. Para os dados das contas de organizadores e voluntários, o Ecclesio é o controlador.
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p><strong>Organizadores e voluntários (conta na plataforma):</strong></p>
            <List items={[
              'Nome, e-mail e senha (guardada apenas de forma criptografada).',
              'Para receber os valores das inscrições: chave PIX, tipo da chave, nome e CPF/CNPJ do titular.',
            ]} />
            <p><strong>Participantes (inscrição em um evento):</strong></p>
            <List items={[
              'Sempre: nome completo, e-mail e CPF.',
              'Conforme o formulário definido pelo organizador: data de nascimento, sexo, estado civil, celular, telefone fixo, endereço (CEP, logradouro, número, bairro, complemento, cidade, estado e país), nome e telefone de um responsável e informação sobre uso de medicamentos.',
              'Dados da inscrição: forma e situação do pagamento, código/QR code de credenciamento e registro de check-in no evento.',
              'Respostas à pesquisa de satisfação, quando você decide respondê-la.',
            ]} />
            <p>
              A informação sobre uso de medicamentos é um <strong>dado pessoal sensível</strong> (dado de saúde). Ela
              só é pedida quando o organizador ativa esse campo e serve exclusivamente para o cuidado com o
              participante durante o evento.
            </p>
          </Section>

          <Section title="3. Para que usamos os dados">
            <List items={[
              'Realizar e gerenciar a sua inscrição, incluindo o controle de vagas.',
              'Processar o pagamento da inscrição e repassar os valores ao organizador.',
              'Enviar e-mails sobre a inscrição: confirmação, ingresso com QR code e convite para a pesquisa de satisfação.',
              'Fazer o credenciamento (check-in) no dia do evento.',
              'Permitir que o organizador e a equipe dele consultem, editem e exportem a lista de inscritos.',
              'Manter a conta de organizadores e voluntários e a segurança da plataforma.',
              'Cumprir obrigações legais e regulatórias, como a guarda de registros financeiros.',
            ]} />
          </Section>

          <Section title="4. Bases legais">
            <List items={[
              <><strong>Execução de contrato</strong> (art. 7º, V): para realizar a inscrição, o pagamento e o credenciamento.</>,
              <><strong>Consentimento</strong> (art. 7º, I, e art. 11, I): você o dá ao marcar a caixa de concordância no formulário de inscrição; para o dado de saúde, o consentimento é específico e destacado nessa mesma etapa.</>,
              <><strong>Cumprimento de obrigação legal</strong> (art. 7º, II): para registros fiscais e financeiros.</>,
              <><strong>Legítimo interesse</strong> (art. 7º, IX): para a segurança da plataforma e prevenção a fraudes.</>,
            ]} />
          </Section>

          <Section title="5. Com quem compartilhamos">
            <p>Não vendemos dados pessoais. Os dados são compartilhados somente com:</p>
            <List items={[
              <><strong>O organizador do evento</strong> e os voluntários que ele cadastrar, que acessam os dados dos inscritos do próprio evento.</>,
              <><strong>Mercado Pago</strong>, que processa os pagamentos (nome, e-mail, CPF e valor).</>,
              <><strong>Provedor de envio de e-mails</strong>, que entrega as mensagens da plataforma (nome e e-mail).</>,
              <><strong>ViaCEP</strong>, consultado pelo seu navegador apenas com o CEP digitado, para preencher o endereço automaticamente.</>,
              <><strong>Provedores de hospedagem e banco de dados</strong> onde a plataforma funciona.</>,
              'Autoridades públicas, quando exigido por lei ou ordem judicial.',
            ]} />
          </Section>

          <Section title="6. Por quanto tempo guardamos">
            <p>
              Os dados de inscrição ficam guardados enquanto forem necessários para o evento e para a prestação de
              contas do organizador. Os dados de conta ficam guardados enquanto a conta existir. Registros de
              pagamentos e repasses são mantidos pelo prazo exigido pela legislação fiscal. Depois disso, os dados são
              excluídos ou anonimizados, e você pode pedir a exclusão antes, observadas essas obrigações legais.
            </p>
          </Section>

          <Section title="7. Segurança">
            <p>
              Usamos conexão criptografada (HTTPS), senhas armazenadas com hash e controle de acesso para que cada
              organizador veja apenas os dados dos próprios eventos. Nenhum sistema é totalmente imune a incidentes;
              se ocorrer algum que possa causar risco relevante a você, comunicaremos você e a ANPD conforme a LGPD.
            </p>
          </Section>

          <Section title="8. Armazenamento no navegador">
            <p>
              Não usamos cookies de publicidade nem de rastreamento. Para manter organizadores e voluntários
              conectados, a plataforma guarda um token de acesso no armazenamento local do navegador, que é apagado
              ao sair da conta.
            </p>
          </Section>

          <Section title="9. Seus direitos">
            <p>Pela LGPD (art. 18), você pode, a qualquer momento:</p>
            <List items={[
              'Confirmar se tratamos seus dados e ter acesso a eles.',
              'Corrigir dados incompletos, inexatos ou desatualizados.',
              'Pedir a anonimização, o bloqueio ou a exclusão de dados desnecessários ou tratados em desconformidade com a lei.',
              'Pedir a portabilidade dos dados.',
              'Saber com quem seus dados foram compartilhados.',
              'Revogar o consentimento e pedir a exclusão dos dados tratados com base nele.',
              'Apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).',
            ]} />
            <p>
              Para exercer esses direitos, escreva para {mail}. Se o pedido for sobre a sua inscrição em um evento,
              você também pode falar direto com o organizador do evento.
            </p>
          </Section>

          <Section title="10. Menores de idade">
            <p>
              A inscrição de crianças e adolescentes deve ser feita ou autorizada pelo responsável legal. Para isso o
              organizador pode pedir o nome e o telefone do responsável e a autorização assinada por ele.
            </p>
          </Section>

          <Section title="11. Alterações desta política">
            <p>
              Esta política pode ser atualizada. A versão vigente fica sempre nesta página, com a data da última
              atualização no topo.
            </p>
          </Section>

          <p className="mt-12" style={textStyle}>
            <Link to="/" style={{ color: '#00186D', textDecoration: 'underline' }}>Voltar para o início</Link>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
