import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import AuthProvider from '@/components/providers/AuthProvider'
import { LanguageProvider } from '@/components/providers/LanguageProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Aarogya Darpan — Modern Hospital Management',
    template: '%s | Aarogya Darpan',
  },
  description:
    'Secure, end-to-end digital hospital management — from patient records to billing — with enterprise-grade privacy and role-based access control.',
  keywords: ['hospital management', 'healthcare', 'patient records', 'digital health', 'EMR'],
  icons: {
    icon: '/favicon.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Aarogya Darpan',
    description: 'Modern Healthcare, Completely Digital',
    type: 'website',
    images: ['/logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#1e293b', color: '#fff', borderRadius: '12px' },
                success: { iconTheme: { primary: '#0d9488', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
