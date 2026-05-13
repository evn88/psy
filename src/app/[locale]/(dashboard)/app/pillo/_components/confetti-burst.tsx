import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

const confettiPieces = [
  { colorClassName: 'bg-emerald-400', x: '-34px', y: '-16px', rotation: '-40deg' },
  { colorClassName: 'bg-sky-400', x: '-28px', y: '20px', rotation: '32deg' },
  { colorClassName: 'bg-amber-400', x: '-10px', y: '-34px', rotation: '12deg' },
  { colorClassName: 'bg-rose-400', x: '8px', y: '-30px', rotation: '-14deg' },
  { colorClassName: 'bg-fuchsia-400', x: '28px', y: '-18px', rotation: '38deg' },
  { colorClassName: 'bg-cyan-400', x: '34px', y: '12px', rotation: '-28deg' },
  { colorClassName: 'bg-lime-400', x: '18px', y: '30px', rotation: '20deg' },
  { colorClassName: 'bg-orange-400', x: '-16px', y: '34px', rotation: '-18deg' }
];

export const ConfettiBurst = () => {
  return (
    <div className="pointer-events-none absolute inset-0">
      {confettiPieces.map((piece, index) => (
        <span
          key={`${piece.x}-${piece.y}`}
          className={cn(
            'absolute left-1/2 top-1/2 h-2 w-1 rounded-full opacity-0 animate-pillo-confetti',
            piece.colorClassName
          )}
          style={
            {
              animationDelay: `${index * 60}ms`,
              ['--confetti-rotate' as string]: piece.rotation,
              ['--confetti-x' as string]: piece.x,
              ['--confetti-y' as string]: piece.y
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
};
