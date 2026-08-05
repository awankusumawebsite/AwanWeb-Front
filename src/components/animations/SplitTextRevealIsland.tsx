import type { ComponentType } from 'react';
import SplitTextReveal from './SplitTextReveal';

interface SplitTextRevealProps {
  text: string;
  className?: string;
  letterClass?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  xOffset?: number;
  triggerOnScroll?: boolean;
  scrollStart?: string;
  waitForPreloader?: boolean;
}

const TypedSplitTextReveal = SplitTextReveal as ComponentType<SplitTextRevealProps>;

export default function SplitTextRevealIsland(props: SplitTextRevealProps) {
  return <TypedSplitTextReveal {...props} />;
}
