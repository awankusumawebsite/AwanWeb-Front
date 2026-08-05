import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from '../../lib/gsap';

let listenerCount = 0;
const cursorPos = { x: 0, y: 0 };

function onGlobalMouseMove(event: MouseEvent) {
  cursorPos.x = event.clientX;
  cursorPos.y = event.clientY;
}

function addGlobalListener() {
  if (listenerCount === 0) {
    window.addEventListener('mousemove', onGlobalMouseMove, { passive: true });
  }
  listenerCount += 1;
}

function removeGlobalListener() {
  listenerCount = Math.max(0, listenerCount - 1);
  if (listenerCount === 0) {
    window.removeEventListener('mousemove', onGlobalMouseMove);
  }
}

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

    addGlobalListener();
    gsap.set(cursorRef.current, { xPercent: -50, yPercent: -50 });

    const xTo = gsap.quickTo(cursorRef.current, 'x', { duration: 0.45, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursorRef.current, 'y', { duration: 0.45, ease: 'power3.out' });

    const handleMouseMove = () => {
      xTo(cursorPos.x);
      yTo(cursorPos.y);
    };

    const handleMouseEnter = () => {
      if (cursorRef.current) {
        gsap.set(cursorRef.current, { x: cursorPos.x, y: cursorPos.y });
      }
      setVisible(true);
    };

    const handleMouseLeave = () => setVisible(false);

    for (const card of cards) {
      card.addEventListener('mousemove', handleMouseMove, { passive: true });
      card.addEventListener('mouseenter', handleMouseEnter, { passive: true });
      card.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    }

    return () => {
      for (const card of cards) {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseenter', handleMouseEnter);
        card.removeEventListener('mouseleave', handleMouseLeave);
      }
      removeGlobalListener();
    };
  }, [mounted, selector]);

  if (!mounted) return null;

  return createPortal(
    <div ref={cursorRef} className="pointer-events-none fixed left-0 top-0 z-[99999]" style={{ willChange: 'transform' }}>
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
