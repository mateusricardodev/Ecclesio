import { useEffect } from 'react'

/**
 * Título, descrição e demais tags de SEO por página.
 *
 * O index.html já traz as tags padrão (as da home). Este hook só troca o
 * conteúdo delas enquanto a página está montada e volta ao padrão ao sair.
 * Serve para o Google, que executa o JavaScript; os robôs de prévia de link
 * (WhatsApp, Instagram) não executam e sempre leem as tags do index.html.
 */

export const SITE_URL = 'https://ecclesio.com.br'

const DEFAULTS = {
  title: 'Ecclesio | Inscrições e pagamentos PIX para eventos',
  description:
    'Crie eventos, receba inscrições e pagamentos via PIX em um só lugar. Formulários personalizados, controle de vagas e confirmação automática por e-mail.',
  image: `${SITE_URL}/og-image.png`,
  path: '/',
}

export interface PageMeta {
  title?: string
  description?: string
  /** URL absoluta da imagem de compartilhamento. */
  image?: string
  /** Caminho canônico da página, ex.: "/evento/retiro-2027". */
  path?: string
  /** Páginas logadas ou de uso único: fora da busca. */
  noindex?: boolean
}

export function usePageMeta(meta: PageMeta) {
  const { title, description, image, path, noindex } = meta

  useEffect(() => {
    applyMeta({ title, description, image, path, noindex })
    return () => applyMeta({})
  }, [title, description, image, path, noindex])
}

/** Monta uma URL absoluta para imagens servidas pela API (ex.: banner em /uploads). */
export function absoluteUrl(url: string): string {
  return new URL(url, window.location.origin).href
}

/** Corta um texto livre para caber numa meta description (~155 caracteres). */
export function toDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

function applyMeta(meta: PageMeta) {
  const title = meta.title ?? DEFAULTS.title
  const description = meta.description ?? DEFAULTS.description
  const image = meta.image ?? DEFAULTS.image
  const url = `${SITE_URL}${meta.path ?? DEFAULTS.path}`

  document.title = title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index,follow')
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image)
  setCanonical(url)
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}
