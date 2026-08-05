import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from '../../lib/gsap';

interface Props {
  selector: string;
  text?: string;
}

export default function DragCursorIsland({ selector, text = 'VIEW' }: Props) {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!mounted || !cursorRef.current) return undefined;

    const cards = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (cards.length === 0) return undefined;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches) return undefined;

    gsap.set(cursorRef.current, { xPercent: -50, yPercent: -50 });

    const xTo = gsap.quickTo(cursorRef.current, 'x', { duration: 0.45, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursorRef.current, 'y', { duration: 0.45, ease: 'power3.out' });

    const handlePointerMove = (event: PointerEvent) => {
      xTo(event.clientX);
      yTo(event.clientY);
    };

    const handlePointerEnter = (event: PointerEvent) => {
      if (cursorRef.current) {
        gsap.set(cursorRef.current, { x: event.clientX, y: event.clientY });
      }
      setVisible(true);
    };

    const handlePointerLeave = () => setVisible(false);

    for (const card of cards) {
      card.addEventListener('pointermove', handlePointerMove, { passive: true });
      card.addEventListener('pointerenter', handlePointerEnter, { passive: true });
      card.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    }

    return () => {
      for (const card of cards) {
        card.removeEventListener('pointermove', handlePointerMove);
        card.removeEventListener('pointerenter', handlePointerEnter);
        card.removeEventListener('pointerleave', handlePointerLeave);
      }
    };
  }, [mounted, selector]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={cursorRef}
      data-drag-cursor
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[99999]"
      style={{ willChange: 'transform' }}
    >
      <div
        className={`flex h-[110px] w-[110px] origin-center transform-gpu items-center justify-center rounded-full bg-[#1c2d3c] text-[13px] font-black tracking-widest text-white transition-[transform,opacity] duration-300 ease-out ${
          visible ? 'scale-100 opacity-90' : 'scale-0 opacity-0'
        }`}
      >
        {text}
      </div>
    </div>,
    document.body,
  );
}
