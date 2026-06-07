'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DeployTokenForm from '@/components/Token/DeployTokenForm';
import CreateAirdropForm from '@/components/Airdrop/CreateAirdropForm';

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export default function Home() {
  const router = useRouter();
  const [tab,     setTab]     = useState<'token' | 'airdrop' | 'find'>('token');
  const [findAddr, setFindAddr] = useState('');
  const [findErr,  setFindErr]  = useState('');

  function handleFind() {
    if (!ADDR_RE.test(findAddr)) { setFindErr('Enter a valid 0x address'); return; }
    router.push(`/claim/${findAddr}`);
  }

  return (
    <div style={{ padding: '36px 16px', maxWidth: 540, margin: '0 auto' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #1e1045, #2d1a6e)',
          border: '1px solid #3b1fa8',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>🪂</div>
        <h1 style={{
          fontSize: 34, fontWeight: 800, margin: '0 0 10px',
          background: 'linear-gradient(135deg, #e2e8f0, #a78bfa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>DropForge</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Deploy ERC-20 tokens and distribute them via Merkle-proof airdrops on Base Sepolia.
        </p>
      </div>

      {/* Feature pills */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
        {['🪙 ERC-20', '🌳 Merkle Tree', '⚡ Gas Efficient', '⛓️ Base Sepolia'].map(f => (
          <span key={f} style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#a78bfa' }}>{f}</span>
        ))}
      </div>

      {/* Card */}
      <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #16163a' }}>
          {(['token', 'airdrop', 'find'] as const).map((t, i) => {
            const labels = ['🪙 Token', '🪂 Airdrop', '🔍 Claim'];
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '13px 0',
                background: tab === t ? '#0f0f28' : 'transparent',
                color: tab === t ? '#a78bfa' : '#64748b',
                fontSize: 13, fontWeight: 600, borderRadius: 0,
                borderBottom: `2px solid ${tab === t ? '#8b5cf6' : 'transparent'}`,
              }}>
                {labels[i]}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 24 }}>
          {tab === 'token'   && <DeployTokenForm />}
          {tab === 'airdrop' && <CreateAirdropForm />}
          {tab === 'find'    && (
            <div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
                Enter a MerkleDistributor address to claim your tokens.
              </div>
              <input
                value={findAddr}
                onChange={e => { setFindAddr(e.target.value); setFindErr(''); }}
                placeholder="0x... distributor contract"
                onKeyDown={e => e.key === 'Enter' && handleFind()}
                style={{ marginBottom: 8, borderColor: findErr ? '#f87171' : undefined }}
              />
              {findErr && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{findErr}</div>}
              <button
                onClick={handleFind}
                style={{
                  width: '100%', padding: '14px 0', marginTop: 4,
                  background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
                }}
              >
                Open Claim Page →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '🪙', title: 'Deploy Token',    desc: 'Create your ERC-20 with name, symbol, supply' },
          { icon: '📋', title: 'Add Recipients',  desc: 'Paste address + amount list' },
          { icon: '🌳', title: 'Merkle Tree',     desc: 'App builds tree, gets root, deploys contract' },
          { icon: '🪂', title: 'Claim',           desc: 'Recipients prove ownership with Merkle proof' },
        ].map(c => (
          <div key={c.title} style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 10, padding: '12px 12px' }}>
            <div style={{ fontSize: 18, marginBottom: 5 }}>{c.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#c4b5fd', marginBottom: 3 }}>{c.title}</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
