// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import Header from '@/components/Header';
import TMDBFooter from '@/components/TMDBFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Streamrolling',
  description: 'Never pay for more than one streaming service at a time',
  icons: { icon: '/favicon.ico' },
  other: { 'impact-site-verification': '2c6441b1-15ea-4cfb-bda4-f94e886582f8' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-zinc-950 text-white flex min-h-screen flex-col`}>
          <Header />
          <main className="flex-1">{children}</main>
          <TMDBFooter />
        </body>
      </html>
    </ClerkProvider>
  );
}