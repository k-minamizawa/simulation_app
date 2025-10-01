import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'デジタルツイン シミュレーション デモ',
  description: '工場シミュレーションFlexSimとWebアプリケーションの連携デモ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <header style={{
            backgroundColor: 'var(--color-main)',
            color: 'white',
            padding: 'var(--spacing-lg) var(--spacing-xl)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              <h1 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'bold',
                margin: 0
              }}>
                デジタルツイン シミュレーション
              </h1>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                opacity: 0.9,
                marginTop: 'var(--spacing-xs)'
              }}>
                FlexSim × Web Application Demo
              </p>
            </div>
          </header>

          <main style={{
            flex: 1,
            padding: 'var(--spacing-2xl) var(--spacing-xl)',
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto'
          }}>
            {children}
          </main>

          <footer style={{
            backgroundColor: 'var(--color-gray-light)',
            padding: 'var(--spacing-lg) var(--spacing-xl)',
            borderTop: '1px solid var(--color-gray-border)',
            textAlign: 'center',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text)',
            opacity: 0.7
          }}>
            <p>© 2024 Digital Twin Demo - Exhibition Project</p>
          </footer>
        </div>
      </body>
    </html>
  )
}