import type { Metadata } from 'next';
import Providers from '@/components/Layout/Providers';
import NavBar from '@/components/Layout/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'DropForge — Merkle Airdrop Tool on Base',
  description: 'Deploy ERC-20 tokens and distribute them via Merkle-proof airdrops on Base Sepolia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          <main style={{ minHeight: 'calc(100vh - 64px)' }}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
