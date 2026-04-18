import type { Metadata } from 'next';
import { Bebas_Neue, Space_Mono, Syne, Inter, Lora } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-mono' });
const syne = Syne({ subsets: ['latin'], variable: '--font-syne' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: 'SeeWhy LIVE — Creator-First Streaming',
  description: 'Multi-platform live streaming with real-time AI, WebRTC guests, and 90/10 monetization.',
  themeColor: '#C8FF00',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${spaceMono.variable} ${syne.variable} ${inter.variable} ${lora.variable}`}>
      <body className="bg-[#0C0806] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
