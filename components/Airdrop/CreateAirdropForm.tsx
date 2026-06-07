'use client';
import { useState, useEffect } from 'react';
import { useDeployContract, useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import {
  parseRecipients, buildMerkleTree, totalAmount, formatAmt, type AirdropEntry,
} from '@/lib/merkle';
import { saveAirdrop } from '@/lib/airdropStorage';
import { SIMPLETOKEN_ABI } from '@/lib/contracts/SimpleToken';
import { MERKLEDISTRIBUTOR_ABI as MERKLEDISTR_ABI, MERKLEDISTRIBUTOR_BYTECODE as MERKLEDISTR_BYTECODE } from '@/lib/contracts/MerkleDistributor';

type Step = 'token' | 'recipients' | 'deploy' | 'fund' | 'done';

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export default function CreateAirdropForm() {
  const { address: userAddr, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [step,          setStep]         = useState<Step>('token');
  const [tokenAddr,     setTokenAddr]    = useState('');
  const [tokenErr,      setTokenErr]     = useState('');
  const [rawList,       setRawList]      = useState('');
  const [entries,       setEntries]      = useState<AirdropEntry[]>([]);
  const [parseErr,      setParseErr]     = useState('');
  const [distribAddr,   setDistribAddr]  = useState<`0x${string}` | null>(null);

  // Read token info
  const { data: tokenName }   = useReadContract({ address: ADDR_RE.test(tokenAddr) ? tokenAddr as `0x${string}` : undefined, abi: SIMPLETOKEN_ABI, functionName: 'name' });
  const { data: tokenSymbol } = useReadContract({ address: ADDR_RE.test(tokenAddr) ? tokenAddr as `0x${string}` : undefined, abi: SIMPLETOKEN_ABI, functionName: 'symbol' });
  const { data: userBalance } = useReadContract({ address: ADDR_RE.test(tokenAddr) ? tokenAddr as `0x${string}` : undefined, abi: SIMPLETOKEN_ABI, functionName: 'balanceOf', args: userAddr ? [userAddr] : undefined });

  // Deploy distributor
  const { deployContract, data: deployHash, isPending: isDeploying, error: deployErr } = useDeployContract();
  const { isSuccess: deployDone, data: deployReceipt } = useWaitForTransactionReceipt({ hash: deployHash });

  // Transfer tokens to distributor
  const { writeContract, data: transferHash, isPending: isTransferring, error: transferErr } = useWriteContract();
  const { isSuccess: transferDone } = useWaitForTransactionReceipt({ hash: transferHash });

  useEffect(() => {
    if (deployDone && deployReceipt?.contractAddress) {
      setDistribAddr(deployReceipt.contractAddress);
      setStep('fund');
    }
  }, [deployDone, deployReceipt]);

  useEffect(() => {
    if (transferDone && distribAddr) {
      // Save to localStorage so claim page can auto-load proofs
      saveAirdrop({
        distributorAddress: distribAddr,
        tokenAddress: tokenAddr,
        tokenSymbol: (tokenSymbol as string) ?? 'TOKEN',
        entries,
        createdAt: Date.now(),
      });
      setStep('done');
    }
  }, [transferDone, distribAddr]);

  function goToRecipients() {
    if (!ADDR_RE.test(tokenAddr)) { setTokenErr('Invalid address'); return; }
    setTokenErr('');
    setStep('recipients');
  }

  function parseAndPreview() {
    try {
      const parsed = parseRecipients(rawList);
      if (parsed.length === 0) { setParseErr('No valid entries found'); return; }
      const invalid = parsed.filter(e => !ADDR_RE.test(e.address));
      if (invalid.length > 0) { setParseErr(`Invalid address on line ${invalid[0].index + 1}: ${invalid[0].address}`); return; }
      const seen = new Set<string>();
      for (const e of parsed) {
        const lower = e.address.toLowerCase();
        if (seen.has(lower)) { setParseErr(`Duplicate address: ${e.address}`); return; }
        seen.add(lower);
      }
      setParseErr('');
      setEntries(parsed);
    } catch (e: unknown) {
      setParseErr(e instanceof Error ? e.message : 'Parse error');
    }
  }

  function handleDeploy() {
    if (!isConnected) { openConnectModal?.(); return; }
    if (MERKLEDISTR_BYTECODE === '0x') { alert('Bytecode missing — run npm run compile'); return; }
    if (entries.length === 0) { setParseErr('Parse recipients first'); return; }
    const { root } = buildMerkleTree(entries);
    deployContract({
      abi: MERKLEDISTR_ABI,
      bytecode: MERKLEDISTR_BYTECODE,
      args: [tokenAddr as `0x${string}`, root],
    });
  }

  function handleFund() {
    if (!distribAddr) return;
    const total = totalAmount(entries);
    writeContract({
      address: tokenAddr as `0x${string}`,
      abi: SIMPLETOKEN_ABI,
      functionName: 'transfer',
      args: [distribAddr, total],
    });
  }

  function downloadProofs() {
    const tree = buildMerkleTree(entries);
    const data = entries.map(e => ({
      index: e.index,
      address: e.address,
      amount: e.amount.toString(),
      amountFormatted: formatAmt(e.amount),
      proof: tree.getProof(e.index),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${distribAddr?.slice(0, 8)}_proofs.json`; a.click();
  }

  const total = entries.length > 0 ? totalAmount(entries) : 0n;
  const hasEnoughBalance = userBalance !== undefined && total > 0n && (userBalance as bigint) >= total;

  /* ─── STEP: done ─── */
  if (step === 'done' && distribAddr) {
    const claimUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/claim/${distribAddr}`;
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#4ade80', marginBottom: 6 }}>Airdrop Live!</div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#a78bfa', wordBreak: 'break-all', marginBottom: 16 }}>
          {distribAddr}
        </div>
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => navigator.clipboard.writeText(claimUrl)}
            style={{ background: '#16163a', color: '#a78bfa', padding: '10px 0', fontSize: 13, borderRadius: 8 }}
          >
            📋 Copy Claim Link
          </button>
          <button
            onClick={downloadProofs}
            style={{ background: '#16163a', color: '#e2e8f0', padding: '10px 0', fontSize: 13, borderRadius: 8 }}
          >
            ⬇️ Download Proof Pack (JSON)
          </button>
          <a
            href={`/claim/${distribAddr}`}
            style={{
              display: 'block', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              color: 'white', padding: '12px 0', fontSize: 14, fontWeight: 700,
              borderRadius: 10, textDecoration: 'none',
            }}
          >
            Open Claim Page →
          </a>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {entries.length} recipients · {formatAmt(total)} {tokenSymbol ?? 'tokens'} distributed
        </div>
      </div>
    );
  }

  /* ─── STEP: fund ─── */
  if (step === 'fund' && distribAddr) {
    return (
      <div style={{ padding: 4 }}>
        <StepHeader current={3} />
        <div style={{ marginBottom: 20, padding: '14px 16px', background: '#0a0a1e', border: '1px solid #1e3a1e', borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>✅ Distributor Deployed</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#a78bfa', wordBreak: 'break-all' }}>{distribAddr}</div>
        </div>
        <div style={{ marginBottom: 20, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
          Now send <strong style={{ color: '#e2e8f0' }}>{formatAmt(total)} {tokenSymbol ?? 'tokens'}</strong> to the distributor contract. Recipients can then claim their allocation.
        </div>
        {!hasEnoughBalance && userBalance !== undefined && (
          <div style={{ background: '#1a0a00', border: '1px solid #78350f', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#fbbf24', fontSize: 13 }}>
            ⚠️ Your balance ({formatAmt(userBalance as bigint)}) is less than the total airdrop amount.
          </div>
        )}
        {transferErr && (
          <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
            {transferErr.message.slice(0, 120)}
          </div>
        )}
        <button
          onClick={handleFund}
          disabled={isTransferring || !hasEnoughBalance}
          style={{
            width: '100%', padding: '14px 0',
            background: isTransferring ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
          }}
        >
          {isTransferring ? 'Confirm in Wallet…' : `💸 Transfer ${formatAmt(total)} ${tokenSymbol ?? 'Tokens'} to Contract`}
        </button>
      </div>
    );
  }

  /* ─── STEP: deploy ─── */
  if (step === 'deploy') {
    return (
      <div style={{ padding: 4 }}>
        <StepHeader current={2} />
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#0e0e22', border: '1px solid #16163a', borderRadius: 8, fontSize: 13, color: '#94a3b8' }}>
          <strong style={{ color: '#a78bfa' }}>{entries.length}</strong> recipients ·{' '}
          <strong style={{ color: '#a78bfa' }}>{formatAmt(total)}</strong> {tokenSymbol ?? 'tokens'} total
        </div>
        <div style={{ marginBottom: 20, maxHeight: 180, overflowY: 'auto' }}>
          {entries.slice(0, 8).map(e => (
            <div key={e.index} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #0e0e22', fontSize: 12 }}>
              <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{e.address.slice(0, 10)}…{e.address.slice(-6)}</span>
              <span style={{ color: '#a78bfa' }}>{formatAmt(e.amount)}</span>
            </div>
          ))}
          {entries.length > 8 && <div style={{ fontSize: 11, color: '#64748b', paddingTop: 6 }}>+ {entries.length - 8} more</div>}
        </div>
        {deployErr && (
          <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
            {deployErr.message.slice(0, 120)}
          </div>
        )}
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          style={{
            width: '100%', padding: '14px 0',
            background: isDeploying ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
          }}
        >
          {!isConnected ? 'Connect Wallet' : isDeploying ? 'Deploying…' : '🚀 Deploy MerkleDistributor'}
        </button>
      </div>
    );
  }

  /* ─── STEP: recipients ─── */
  if (step === 'recipients') {
    return (
      <div style={{ padding: 4 }}>
        <StepHeader current={1} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
            Recipients — one per line: <code style={{ color: '#a78bfa' }}>0xAddress, amount</code>
          </label>
          <textarea
            value={rawList}
            onChange={e => { setRawList(e.target.value); setParseErr(''); setEntries([]); }}
            placeholder={'0xAbc...123, 100\n0xDef...456, 250\n0x789...aaa, 50'}
            rows={7}
          />
          {parseErr && <div style={{ color: '#f87171', fontSize: 12, marginTop: 5 }}>{parseErr}</div>}
        </div>

        {entries.length > 0 && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: '#0a1a0a', border: '1px solid #1e3a1e', borderRadius: 8, fontSize: 13, color: '#4ade80' }}>
            ✅ {entries.length} recipients · {formatAmt(total)} {tokenSymbol ?? 'tokens'} total
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={parseAndPreview}
            style={{ flex: 1, padding: '10px 0', background: '#16163a', color: '#a78bfa', fontSize: 13 }}
          >
            Preview
          </button>
          <button
            onClick={() => { if (entries.length === 0) { parseAndPreview(); return; } setStep('deploy'); }}
            disabled={entries.length === 0 && rawList.trim().length === 0}
            style={{
              flex: 2, padding: '10px 0', fontSize: 14, fontWeight: 700,
              background: entries.length > 0 ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : '#16163a',
              color: 'white', borderRadius: 8,
            }}
          >
            {entries.length > 0 ? 'Next: Deploy Contract →' : 'Preview First'}
          </button>
        </div>
      </div>
    );
  }

  /* ─── STEP: token ─── */
  return (
    <div style={{ padding: 4 }}>
      <StepHeader current={0} />
      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Token Contract Address</label>
      <input
        value={tokenAddr}
        onChange={e => { setTokenAddr(e.target.value); setTokenErr(''); }}
        placeholder="0x... ERC-20 token address"
        style={{ marginBottom: 4, borderColor: tokenErr ? '#f87171' : undefined }}
      />
      {tokenErr && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{tokenErr}</div>}

      {tokenName && (
        <div style={{ padding: '10px 12px', background: '#0a1a0a', border: '1px solid #1e3a1e', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
          <span style={{ color: '#4ade80' }}>✅ {tokenName as string}</span>
          <span style={{ color: '#64748b' }}> ({tokenSymbol as string}) · Your balance: {userBalance !== undefined ? formatAmt(userBalance as bigint) : '—'}</span>
        </div>
      )}

      <button
        onClick={goToRecipients}
        style={{
          width: '100%', padding: '14px 0', marginTop: 6,
          background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
          color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
        }}
      >
        Next: Add Recipients →
      </button>
      <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
        Don&apos;t have a token? Use the <strong style={{ color: '#94a3b8' }}>Create Token</strong> tab first.
      </div>
    </div>
  );
}

function StepHeader({ current }: { current: number }) {
  const steps = ['Token', 'Recipients', 'Deploy', 'Fund'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: i < current ? '#1a3a1a' : i === current ? '#8b5cf6' : '#16163a',
            border: `2px solid ${i < current ? '#4ade80' : i === current ? '#a78bfa' : '#2a2a5a'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: i < current ? '#4ade80' : i === current ? 'white' : '#64748b',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 11, marginLeft: 4, color: i === current ? '#a78bfa' : '#64748b', flex: 1 }}>{label}</span>
          {i < steps.length - 1 && <div style={{ height: 1, background: '#16163a', flex: 0.5, marginRight: 4 }} />}
        </div>
      ))}
    </div>
  );
}
