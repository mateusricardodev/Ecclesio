import { Link } from 'react-router-dom'

const LINKS = [
  { label: 'Recursos', href: '/#recursos' },
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Dúvidas', href: '/#duvidas' },
]

export function Footer() {
  return (
    <footer className="max-w-[1500px] mx-auto px-4 sm:px-10">
      <div className="border-t border-ecc-line pt-10 pb-5 flex flex-col gap-20">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <nav className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold" style={{ letterSpacing: '-0.025em' }}>
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-ecc-ink hover:text-ecc-navy transition-colors">{l.label}</a>
            ))}
            <Link to="/privacidade" className="text-ecc-ink hover:text-ecc-navy transition-colors">Privacidade</Link>
            <Link to="/login" className="text-ecc-ink hover:text-ecc-navy transition-colors">Entrar</Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <Link to="/" className="shrink-0">
            <img src="/logo-horizontal.png" alt="Ecclesio" className="h-10 object-contain" />
          </Link>
          <p className="ecc-eyebrow flex-1 flex gap-4">
            <span>© Ecclesio.</span>
            <span>{new Date().getFullYear()}</span>
          </p>
          <p className="ecc-eyebrow">Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  )
}
