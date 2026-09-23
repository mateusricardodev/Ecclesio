import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer style={{ background: '#00186D', color: 'rgba(255,255,255,0.55)' }}>
      <div className="max-w-7xl mx-auto px-6 py-14">

        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <img src="/logo-ecclesio.png" alt="Ecclesio" className="h-8 object-contain brightness-0 invert" />
            </Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ fontFamily: 'var(--font-sans)' }}>
              Plataforma de gestão de eventos para igrejas e comunidades católicas. Simples, eficiente e gratuita para começar.
            </p>

            {/* Linha dourada */}
            <div className="h-px w-12 mt-6" style={{ background: '#D4B16A' }} />
          </div>

          {/* Plataforma */}
          <div>
            <h4
              className="text-sm font-semibold mb-4"
              style={{ color: '#FFFFFF', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em' }}
            >
              Plataforma
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              <li><Link to="/register" className="transition-colors hover:text-white">Criar conta</Link></li>
              <li><Link to="/login" className="transition-colors hover:text-white">Entrar</Link></li>
              <li><a href="#como-funciona" className="transition-colors hover:text-white">Como funciona</a></li>
              <li><a href="#diferenciais" className="transition-colors hover:text-white">Diferenciais</a></li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h4
              className="text-sm font-semibold mb-4"
              style={{ color: '#FFFFFF', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em' }}
            >
              Institucional
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              <li><span style={{ color: 'rgba(255,255,255,0.3)' }}>Sobre</span></li>
              <li><Link to="/privacidade" className="transition-colors hover:text-white">Privacidade</Link></li>
              <li><span style={{ color: 'rgba(255,255,255,0.3)' }}>Termos de uso</span></li>
              <li><span style={{ color: 'rgba(255,255,255,0.3)' }}>Contato</span></li>
            </ul>
          </div>
        </div>

        {/* Rodapé */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-sans)' }}
        >
          <p>© {new Date().getFullYear()} Ecclesio. Todos os direitos reservados.</p>
          <p style={{ color: '#D4B16A' }}>✦ Feito para a missão da Igreja</p>
        </div>
      </div>
    </footer>
  )
}
