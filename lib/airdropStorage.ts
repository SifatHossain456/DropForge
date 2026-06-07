import type { AirdropEntry } from './merkle';

export interface AirdropRecord {
  distributorAddress: string;
  tokenAddress:       string;
  tokenSymbol:        string;
  entries:            AirdropEntry[];
  createdAt:          number;
}

const KEY = (addr: string) => `dropforge_airdrop_${addr.toLowerCase()}`;

export function saveAirdrop(record: AirdropRecord): void {
  try {
    localStorage.setItem(KEY(record.distributorAddress), JSON.stringify(record, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    ));
  } catch { /* ignore */ }
}

export function loadAirdrop(distributorAddress: string): AirdropRecord | null {
  try {
    const raw = localStorage.getItem(KEY(distributorAddress));
    if (!raw) return null;
    const rec = JSON.parse(raw);
    rec.entries = rec.entries.map((e: { index: number; address: string; amount: string }) => ({
      ...e,
      amount: BigInt(e.amount),
    }));
    return rec;
  } catch { return null; }
}
