import type { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Header } from "@/components/header"

export const metadata: Metadata = {
    metadataBase: new URL('https://neboat.mit.edu'),
    title: {
        template: '%s | Tao B. Schardl',
        default: 'Tao B. Schardl',
    },
    alternates: {
        canonical: './'
    },
    generator: 'Next.js',
    authors: [{ name: 'Tao B. Schardl', url: 'https://neboat.mit.edu' }],
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    openGraph: {
        type: 'website'
    },
    referrer: 'origin-when-cross-origin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    // Create any shared layout or styles here
    return (
        <html lang="en">
            <body>
                <Header />
                {children}
            </body>
            <GoogleAnalytics gaId="G-6TCR87FRLX" />
        </html>
    )
}
