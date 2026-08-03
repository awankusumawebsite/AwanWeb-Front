"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const SplitTextReveal = React.memo(function SplitTextReveal({ 
  text, 
  className = "", 
  letterClass = "",
  delay = 0, 
  duration = 1.0, 
  stagger = 0.03,
  xOffset = 40,
  triggerOnScroll = false,
  scrollStart = "top 80%",
  waitForPreloader = false,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    let handler = null;

    const ctx = gsap.context(() => {
      if (typeof window !== 'undefined' && window.__IS_BOT) return;

      const letters = containerRef.current.querySelectorAll(".split-letter");
      
      gsap.set(letters, { opacity: 0, x: xOffset });

      const animate = (extraDelay = 0) => {
        const animProps = {
          x: 0,
          opacity: 1,
          duration: duration,
          ease: "power4.out",
          stagger: stagger,
          delay: triggerOnScroll ? 0 : delay + extraDelay
        };

        if (triggerOnScroll) {
          animProps.scrollTrigger = {
            trigger: containerRef.current,
            start: scrollStart,
          };
        }

        gsap.to(letters, animProps);
      };

      if (waitForPreloader) {
        const preloader = document.querySelector("[data-preloader]");
        if (!preloader || preloader.style.display === "none") {
          animate();
        } else {
          handler = () => animate(0.1);
          window.addEventListener("preloaderComplete", handler, { once: true });
        }
      } else {
        animate();
      }

    }, containerRef);
    
    return () => {
      ctx.revert();
      if (handler) window.removeEventListener("preloaderComplete", handler);
    };
  }, [delay, duration, stagger, xOffset, triggerOnScroll, scrollStart, waitForPreloader]);

  return (
    <span ref={containerRef} className={`inline-block ${className}`}>
      {text.split(" ").map((word, wordIndex, wordsArray) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split("").map((char, charIndex) => (
            <span 
              key={charIndex} 
              className={`inline-block split-letter ${letterClass}`}
            >
              {char}
            </span>
          ))}
          {wordIndex < wordsArray.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
});

export default SplitTextReveal;
