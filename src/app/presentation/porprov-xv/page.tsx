// TARUH DI: src/app/presentation/porprov-xv/page.tsx
// Hapus file page.tsx yang ada di public/Presentation/porprov-xv/

export default function PresentationPage() {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Intelligence Command Center — PORPROV XV</title>
        <style>{`* { margin:0; padding:0; } html, body { height:100%; overflow:hidden; }`}</style>
      </head>
      <body>
        <iframe
          src="/Presentation/porprov-xv/index.html"
          style={{ width:'100vw', height:'100vh', border:'none', display:'block' }}
          title="Intelligence Command Center PORPROV XV"
          allowFullScreen
        />
      </body>
    </html>
  )
}