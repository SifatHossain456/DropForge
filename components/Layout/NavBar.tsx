'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function NavBar() {
  return (
    <nav style={{
      background: '#0a0a1e', borderBottom: '1px solid #16163a',
      padding: '0 24px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>🪂</div>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0' }}>
          Drop<span style={{ color: '#a78bfa' }}>Forge</span>
        </span>
      </Link>
      <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
    </nav>
  );
}
