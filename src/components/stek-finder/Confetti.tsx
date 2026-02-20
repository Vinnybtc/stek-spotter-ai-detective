import { useEffect, useState } from 'react';

const COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

interface Piece {
  id: number;
  left: string;
  color: string;
  delay: string;
  size: number;
}

const Confetti = ({ trigger }: { trigger: boolean }) => {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const newPieces: Piece[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: `${Math.random() * 0.8}s`,
      size: 6 + Math.random() * 8,
    }));

    setPieces(newPieces);

    const timer = setTimeout(() => setPieces([]), 3000);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </>
  );
};

export default Confetti;
