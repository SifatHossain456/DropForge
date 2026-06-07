'use client';
import { useState } from 'react';
import { useDeployContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { SIMPLETOKEN_ABI, SIMPLETOKEN_BYTECODE } from '@/lib/contracts/SimpleToken';

export default function DeployTokenForm() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { deployContract, data: hash, isPending, error } = useDeployContract();
  const { isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [name,   setName]   = useState('');
  const [symbol, setSymbol] = useState('');
  const [supply, setSupply] = useState('');
  const [errs,   setErrs]   = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())   e.name   = 'Required';
    if (!symbol.trim()) e.symbol = 'Required';
    const n = parseFloat(supply);
    if (isNaN(n) || n <= 0) e.supply = 'Must be positive';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  function handleDeploy() {
    if (!isConnected) { openConnectModal?.(); return; }
    if (SIMPLETOKEN_BYTECODE === '0x') { alert('Run `npm run compile` first'); return; }
    if (!validate()) return;
    deployContract({
      abi: SIMPLETOKEN_ABI,
      bytecode: SIMPLETOKEN_BYTECODE,
      args: [name.trim(), symbol.trim().toUpperCase(), BigInt(Math.floor(parseFloat(supply)))],
    });
  }

  if (isSuccess && receipt?.contractAddress) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🪙</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#4ade80', marginBottom: 6 }}>Token Deployed!</div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#a78bfa', wordBreak: 'break-all', marginBottom: 12 }}>
          {receipt.contractAddress}
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(receipt.contractAddress!)}
          style={{ background: '#16163a', color: '#a78bfa', padding: '8px 16px', fontSize: 13 }}
        >
          Copy Address
        </button>
        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
          Use this address in the "Create Airdrop" tab.
        </div>
      </div>
    );
  }

  const fields = [
    { key: 'name',   label: 'Token Name',   value: name,   set: setName,   placeholder: 'My Project Token' },
    { key: 'symbol', label: 'Ticker Symbol', value: symbol, set: setSymbol, placeholder: 'MPT' },
    { key: 'supply', label: 'Total Supply',  value: supply, set: setSupply, placeholder: '1000000', type: 'number' },
  ];

  return (
    <div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
        Deploy your own ERC-20 token. Full supply goes to your wallet.
      </div>
      {fields.map(f => (
        <div key={f.key} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>{f.label}</label>
          <input
            value={f.value}
            onChange={e => { f.set(e.target.value); setErrs(p => ({ ...p, [f.key]: '' })); }}
            placeholder={f.placeholder}
            type={f.type}
            style={{ borderColor: errs[f.key] ? '#f87171' : undefined }}
          />
          {errs[f.key] && <div style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errs[f.key]}</div>}
        </div>
      ))}

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
          {error.message.slice(0, 120)}
        </div>
      )}

      <button
        onClick={handleDeploy}
        disabled={isPending}
        style={{
          width: '100%', padding: '14px 0', marginTop: 4,
          background: isPending ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
          color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
        }}
      >
        {!isConnected ? 'Connect Wallet' : isPending ? 'Confirm in Wallet…' : '🪙 Deploy ERC-20 Token'}
      </button>
    </div>
  );
}
