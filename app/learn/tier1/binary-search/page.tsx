'use client';
import dynamic from 'next/dynamic';

const BinarySearchGame = dynamic(
  () => import('@/components/games/tier1/binary-search/BinarySearchGame').then(m => m.BinarySearchGame),
  { ssr: false },
);

export default function BinarySearchPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050810' }}>
      <BinarySearchGame />
    </div>
  );
}
