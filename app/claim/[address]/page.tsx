import ClaimCard from '@/components/Airdrop/ClaimCard';
import Link from 'next/link';

interface Props { params: { address: string }; }

export default function ClaimPage({ params }: Props) {
  return (
    <div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 16px 0' }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>
          ← DropForge Home
        </Link>
      </div>
      <ClaimCard address={params.address as `0x${string}`} />
    </div>
  );
}
