'use client';
import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { loadAirdrop } from '@/lib/airdropStorage';
import { buildMerkleTree, parseRecipients, formatAmt, type AirdropEntry } from '@/lib/merkle';
import { MERKLEDISTRIBUTOR_ABI as MERKLEDISTR_ABI } from '@/lib/contracts/MerkleDistributor';

interface Props { address: `0x${string}`; }

export default function ClaimCard({ address }: Props) {
  const { address: userAddr, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [rawList,  setRawList]  = useState('');
  const [entries,  setEntries]  = useState<AirdropEntry[] | null>(null);
  const [parseErr, setParseErr] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const { data: token }        = useReadContract({ address, abi: MERKLEDISTR_ABI, functionName: 'token' });
  const { data: claimedCount, refetch } = useReadContract({ address, abi: MERKLEDISTR_ABI, functionName: 'claimedCount' });

  const { writeContract, data: claimHash, isPending, error } = useWriteContract();
  const { isSuccess: claimDone } = useWaitForTransactionReceipt({ hash: claimHash });

  useEffect(() => { if (claimDone) refetch(); }, [claimDone]);

  // Auto-load from localStorage
  useEffect(() => {
    const rec = loadAirdrop(address);
    if (rec) setEntries(rec.entries);
  }, [address]);

  const myEntry = entries && userAddr
    ? entries.find(e => e.address.toLowerCase() === userAddr.toLowerCase())
    : null;

  const tree = entries ? buildMerkleTree(entries) : null;

  const { data: claimed } = useReadContract({
    address, abi: MERKLEDISTR_ABI, functionName: 'isClaimed',
    args: myEntry !== undefined && myEntry !== null ? [BigInt(myEntry.index)] : undefined,
  });

  function handleClaim() {
    if (!isConnected) { openConnectModal?.(); return; }
    if (!myEntry || !tree) return;
    const proof = tree.getProof(myEntry.index);
    writeContract({
      address, abi: MERKLEDISTR_ABI, functionName: 'claim',
      args: [BigInt(myEntry.index), myEntry.address, myEntry.amount, proof],
    });
  }

  function handleManualParse() {
    try {
      const parsed = parseRecipients(rawList);
      if (parsed.length === 0) { setParseErr('No entries found'); return; }
      setEntries(parsed);
      setParseErr('');
      setShowPaste(false);
    } catch (e: unknown) {
      setParseErr(e instanceof Error ? e.message : 'Parse error');
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Distributor</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#a78bfa', wordBreak: 'break-all' }}>{address}</div>
        {token && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Token: {token as string}</div>}
        {claimedCount !== undefined && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {claimedCount.toString()} addresses claimed
          </div>
        )}
      </div>

      {!entries && (
        <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
            Allocation data not found. Paste the recipient list to auto-generate your proof:
          </div>
          {!showPaste ? (
            <button
              onClick={() => setShowPaste(true)}
              style={{ width: '100%', padding: '10px 0', background: '#16163a', color: '#a78bfa', fontSize: 13 }}
            >
              Paste Recipient List
            </button>
          ) : (
            <>
              <textarea value={rawList} onChange={e => { setRawList(e.target.value); setParseErr(''); }} placeholder={'0xAbc...123, 100\n0xDef...456, 250'} rows={5} style={{ marginBottom: 8 }} />
              {parseErr && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{parseErr}</div>}
              <button onClick={handleManualParse} style={{ width: '100%', padding: '10px 0', background: '#8b5cf6', color: 'white', fontSize: 13 }}>Load Allocation Data</button>
            </>
          )}
        </div>
      )}

      {entries && !isConnected && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>Connect your wallet to check your allocation.</div>
          <button onClick={() => openConnectModal?.()} style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white', padding: '12px 32px', fontSize: 14, fontWeight: 700, borderRadius: 10 }}>
            Connect Wallet
          </button>
        </div>
      )}

      {entries && isConnected && !myEntry && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 700, color: '#f87171', fontSize: 16, marginBottom: 6 }}>Not in Airdrop</div>
          <div style={{ color: '#64748b', fontSize: 13 }}>Your address is not included in this distribution.</div>
        </div>
      )}

      {myEntry && (
        <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Your Allocation</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
            {formatAmt(myEntry.amount)}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>tokens · index #{myEntry.index}</div>

          {claimDone && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#4ade80', fontWeight: 700, marginBottom: 12 }}>
              ✅ Claimed successfully!
            </div>
          )}

          {(claimed as boolean) && !claimDone ? (
            <div style={{ textAlign: 'center', padding: 16, background: '#0a1a0a', border: '1px solid #1e3a1e', borderRadius: 8, color: '#4ade80', fontWeight: 700 }}>
              ✅ Already Claimed
            </div>
          ) : !claimed && (
            <>
              {error && (
                <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
                  {error.message.slice(0, 120)}
                </div>
              )}
              <button
                onClick={handleClaim}
                disabled={isPending}
                style={{
                  width: '100%', padding: '14px 0',
                  background: isPending ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
                }}
              >
                {isPending ? 'Confirm in Wallet…' : '🪂 Claim Tokens'}
              </button>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 10 }}>
                Proof generated automatically from Merkle tree
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
