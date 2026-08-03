"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const HeadingReveal = React.memo(function HeadingReveal({ 
  text, 
  as: Component = "h2", 
  className = "",
  delay = 0,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      if (typeof window !== 'undefined' && window.__IS_BOT) return;

      // ✅ SCOPED selector — only targets words INSIDE this specific instance
      const words = containerRef.current.querySelectorAll(".reveal-mask-word");
      
      gsap.set(words, { y: "110%" });

      gsap.to(words, {
        y: "0%",
        duration: 1.0,
        ease: "power4.out",
        stagger: 0.05,
        delay: delay,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
        }
      });
    }, containerRef);
    
    return () => ctx.revert();
  }, [delay]);

  return (
    <Component ref={containerRef} className={className}>
      {text.split(" ").map((word, wordIndex, array) => (
        <span key={wordIndex} className="inline-flex whitespace-pre align-bottom">
          <span className="overflow-hidden pb-[0.15em] -mb-[0.15em]">
            <span className="reveal-mask-word inline-block origin-top-left" style={{ willChange: "transform" }}>
              {word}
            </span>
          </span>
          {wordIndex < array.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Component>
  );
});

export default HeadingReveal;
