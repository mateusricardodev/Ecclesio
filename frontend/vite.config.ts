import { defineConfig, createServer, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// O verificador de branding do Google (tela de consentimento OAuth) lê o HTML
// cru de /privacidade e não executa JavaScript — no SPA ele só via
// <div id="root"></div> e recusava a política por "conteúdo insuficiente".
// Aqui o texto da política é renderizado para HTML estático em
// dist/privacidade/index.html. O nginx serve esse arquivo e, quando o bundle
// carrega, o React substitui o conteúdo pela página normal.
function prerenderPrivacyPolicy(): Plugin {
  return {
    name: 'prerender-privacy-policy',
    apply: 'build',
    async closeBundle() {
      const server = await createServer({
        configFile: false,
        appType: 'custom',
        logLevel: 'error',
        server: { middlewareMode: true, hmr: false },
        optimizeDeps: { noDiscovery: true },
        plugins: [react()],
      })
      try {
        const { renderToStaticMarkup } = await import('react-dom/server')
        const { createElement } = await import('react')
        const { PrivacyContent } = await server.ssrLoadModule('/src/pages/PrivacyContent.tsx')

        const body = renderToStaticMarkup(
          createElement('main', { className: 'pt-16 pb-20 px-4 sm:px-6' },
            createElement('article', { className: 'max-w-3xl mx-auto' }, createElement(PrivacyContent))),
        )

        const dist = fileURLToPath(new URL('./dist', import.meta.url))
        const title = 'Política de Privacidade | Ecclesio'
        const description =
          'Quais dados pessoais o Ecclesio coleta, para que são usados, com quem são compartilhados e como exercer seus direitos pela LGPD.'
        const url = 'https://ecclesio.com.br/privacidade/'

        const html = setHeadTags(await readFile(resolve(dist, 'index.html'), 'utf-8'), { title, description, url })
          .replace(/<div id="root">[\s\S]*?<\/div>\s*<\/body>/, `<div id="root">${body}</div>
  </body>`)

        if (!html.includes('Política de Privacidade</h1>') || !html.includes(`<title>${title}</title>`)) {
          throw new Error('prerender da política de privacidade não entrou no HTML')
        }

        await mkdir(resolve(dist, 'privacidade'), { recursive: true })
        await writeFile(resolve(dist, 'privacidade', 'index.html'), html)
      } finally {
        await server.close()
      }
    },
  }
}

// Troca título, descrição, canonical e as tags de compartilhamento do index.html
// gerado, para uma página que tem HTML estático próprio.
function setHeadTags(html: string, { title, description, url }: { title: string; description: string; url: string }) {
  const attr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g, `$1${attr(description)}"`)
    .replace(/(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*"/g, `$1${attr(title)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
}

export default defineConfig({
  plugins: [react(), tailwindcss(), prerenderPrivacyPolicy()],
})
