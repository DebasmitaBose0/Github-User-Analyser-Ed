import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from '@/lib/ThemeContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { logError } from '@/lib/errorLogger'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ErrorBoundary onError={(err) => logError('App', err)}>
        <Component {...pageProps} />
      </ErrorBoundary>
    </ThemeProvider>
  )
}