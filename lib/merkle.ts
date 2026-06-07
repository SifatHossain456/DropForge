import { keccak256, encodePacked, parseUnits, formatUnits } from 'viem';

export type Hex = `0x${string}`;

export interface AirdropEntry {
  index:   number;
  address: Hex;
  amount:  bigint; // in wei (18 decimals)
}

/** Parse "0xAddr, amount\n..." text into entries */
export function parseRecipients(raw: string): AirdropEntry[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split(/[\s,]+/).filter(Boolean);
      const addr  = parts[0] as Hex;
      const amt   = parts[1] ?? '0';
      return { index: i, address: addr, amount: parseUnits(amt, 18) };
    });
}

/** Hash a single leaf: keccak256(abi.encodePacked(index, address, amount)) */
export function hashLeaf(entry: AirdropEntry): Hex {
  return keccak256(encodePacked(
    ['uint256', 'address', 'uint256'],
    [BigInt(entry.index), entry.address, entry.amount],
  ));
}

/** Hash a pair of hashes, sorted — matches Solidity's sorted-pair verification */
function hashPair(a: Hex, b: Hex): Hex {
  const [lo, hi] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return keccak256(encodePacked(['bytes32', 'bytes32'], [lo, hi]));
}

export interface MerkleTree {
  root:     Hex;
  getProof: (index: number) => Hex[];
  leaves:   Hex[];
}

/** Build a sorted-pair Merkle tree from entries */
export function buildMerkleTree(entries: AirdropEntry[]): MerkleTree {
  if (entries.length === 0) throw new Error('No entries');

  const leaves: Hex[] = entries.map(hashLeaf);
  const layers: Hex[][] = [leaves];
  let level = leaves;

  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(
        i + 1 < level.length
          ? hashPair(level[i], level[i + 1])
          : level[i], // odd node carries up unchanged
      );
    }
    level = next;
    layers.push(level);
  }

  function getProof(leafIdx: number): Hex[] {
    const proof: Hex[] = [];
    let idx = leafIdx;
    for (let d = 0; d < layers.length - 1; d++) {
      const sibIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (sibIdx < layers[d].length) proof.push(layers[d][sibIdx]);
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  return { root: layers[layers.length - 1][0], getProof, leaves };
}

export function totalAmount(entries: AirdropEntry[]): bigint {
  return entries.reduce((s, e) => s + e.amount, 0n);
}

export function formatAmt(wei: bigint): string {
  return parseFloat(formatUnits(wei, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}
