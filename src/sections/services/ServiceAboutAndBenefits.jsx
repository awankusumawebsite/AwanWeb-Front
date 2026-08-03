"use client";

import React, { useRef } from "react";
import { gsap, ScrollTrigger, MotionPathPlugin } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import SplitTextReveal from "@/components/animations/SplitTextReveal";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export default function ServiceAboutAndBenefits({ data, serviceName }) {
  const sectionRef = useRef(null);
  const pathRef = useRef(null);
  const containerRef = useRef(null);
  const sparkRef = useRef(null);

  useGSAP(() => {
    if (!data?.benefits?.length) return;

    const path = pathRef.current;
    if (path) {
      const pathLength = path.getTotalLength();
      
      // Set initial stroke dash properties
      gsap.set(path, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
      });

      // 2. Exact Coordinate Mapping for Spark on the SVG Path
      const updateSparkPos = (p, el) => {
        const pt = path.getPointAtLength(p * pathLength);
        const xPercent = (pt.x / 100) * 100;
        const yPercent = (pt.y / 1000) * 100;

        gsap.set(el, { 
          left: `${xPercent}%`, 
          top: `${yPercent}%`,
          xPercent: -50, 
          yPercent: -50 
        });
      };

      // 3. Shared Timeline for perfect sync (Shared Scrub)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 50%",
          end: "bottom 50%",
          scrub: 1.5,
        }
      });

      // Animate line drawing
      tl.to(path, { strokeDashoffset: 0, ease: "none" }, 0);

      // Animate spark position via proxy to match the timeline progress
      const proxy = { val: 0 };
      
      // Set initial position immediately (Avoids "Left Side" bug)
      updateSparkPos(0, sparkRef.current);
      gsap.set(sparkRef.current, { opacity: 0 }); // Hide before scroll starts

      tl.to(proxy, {
        val: 1,
        ease: "none",
        onUpdate: () => {
          updateSparkPos(proxy.val, sparkRef.current);
          // Show spark as soon as drawing begins
          if (proxy.val > 0) gsap.set(sparkRef.current, { opacity: 1 });
        }
      }, 0);

      // 4. The "Ink Drop" Expansion (Explosion)
      // We trigger this when the container hits the top (user scrolls into the next section)
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "bottom 50%", // Trigger exactly when the path animation finishes
        end: "bottom top", 
        scrub: 1,
        animation: gsap.to(sparkRef.current, {
           scale: 450, // Massive scale to cover the very long sections below (Trust + Pricing)
           backgroundColor: "#0f172a", // Slate 900 (Dark, elegant, not colorful)
           boxShadow: "none",
           ease: "power2.in"
        })
      });
    }

    // --- Color Reveal Effects ---
    gsap.fromTo('.benefits-title',
      { color: "rgba(28, 45, 60, 0.15)" },
      {
        color: "#1C2D3C",
        scrollTrigger: {
          trigger: '.benefits-title',
          start: "top 75%",
          end: "top 45%",
          scrub: true,
        }
      }
    );

    const items = gsap.utils.toArray('.editorial-item');
    items.forEach((item) => {
      const bgNumber = item.querySelector('.bg-number');
      if (bgNumber) {
        gsap.to(bgNumber, {
          y: -50,
          ease: "none",
          scrollTrigger: {
            trigger: item,
            start: "top bottom",
            end: "bottom top",
            scrub: 1
          }
        });

        gsap.fromTo(bgNumber,
          { color: "rgba(28, 45, 60, 0.04)" },
          {
            color: "rgba(28, 45, 60, 0.25)",
            scrollTrigger: {
              trigger: item,
              start: "top 70%",
              end: "top 30%",
              scrub: true,
            }
          }
        );
      }

      const texts = item.querySelectorAll('.reveal-mask');
      gsap.fromTo(texts, 
        { y: "110%", opacity: 0, skewY: 3 },
        {
          y: "0%",
          opacity: 1,
          skewY: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: "power4.out",
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
            toggleActions: "play none none reverse",
          }
        }
      );
    });

  }, { scope: sectionRef });

  if (!data) return null;

  return (
    <section ref={sectionRef} className="w-full bg-white text-black py-24 lg:py-36 relative font-sans">
      
      {/* 1. The Spark Expansion (Behind Content, allows bleed) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
         <div 
            ref={sparkRef} 
            className="absolute w-6 h-6 rounded-full bg-elm shadow-[0_0_40px_#1C768F,0_0_15px_#fff]"
         />
      </div>

      {/* 2. The Dynamic Guide Line (SVG - Behind Content) */}
      <svg 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-20"
        viewBox="0 0 100 1000"
        preserveAspectRatio="none"
      >
        <path
          ref={pathRef}
          d="M 50 0 Q 60 100 50 200 T 50 400 T 50 600 T 50 800 T 50 1000"
          fill="none"
          stroke="#1C768F"
          strokeWidth="1"
          strokeLinecap="round"
          className="will-change-[stroke-dashoffset]"
        />
      </svg>

      <div ref={containerRef} className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 relative z-20 flex flex-col gap-20 lg:gap-24">
        
        {/* Intro Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 relative">
          <div className="md:col-span-12 lg:col-span-10 flex flex-col gap-6 z-20">
             <div className="flex items-center gap-4">
                <span className="w-8 h-[1px] bg-elm inline-block"></span>
                <span className="text-elm font-bold tracking-widest uppercase text-[10px] md:text-xs">
                  Fundamental Layanan
                </span>
             </div>
             <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-none text-big-stone">
                <SplitTextReveal 
                   text={data.title || `Apa itu ${serviceName}?`} 
                   triggerOnScroll={true} 
                />
             </h2>
             <div className="relative overflow-hidden py-1">
                 <p className="intro-reveal-mask text-lg md:text-xl lg:text-2xl text-black/85 leading-relaxed font-medium md:max-w-4xl mt-2">
                    {data.description}
                 </p>
             </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="relative mt-16 md:mt-24">
           <div className="mb-16 md:mb-24 flex md:justify-center overflow-hidden py-1">
              <h3 className="intro-reveal-mask benefits-title text-xl md:text-3xl lg:text-4xl font-black tracking-tight uppercase md:text-center max-w-2xl">
                 {data.benefitsTitle}
              </h3>
           </div>

           <div className="flex flex-col gap-20 md:gap-32 lg:gap-40 relative">
              {data.benefits.map((benefit, idx) => {
                 const isEven = idx % 2 === 0;
                 const alignmentClass = isEven 
                    ? "md:mr-auto md:w-[48%] md:pr-12" 
                    : "md:ml-auto md:w-[48%] md:pl-12";

                 return (
                   <div key={idx} className={`editorial-item relative flex flex-col ${alignmentClass} group`}>
                     <span className="bg-number absolute -top-12 md:-top-16 left-0 md:left-[-20px] text-[100px] md:text-[180px] font-black text-black/4 select-none z-0 pointer-events-none leading-none tracking-tighter">
                       {String(idx + 1).padStart(2, '0')}
                     </span>
                     
                     <div className="relative z-10 flex flex-col overflow-hidden py-1">
                        <h4 className="reveal-mask text-2xl md:text-4xl font-extrabold tracking-tight text-big-stone mb-3 md:mb-5">
                          {benefit.title}
                        </h4>
                     </div>
                     <div className="relative z-10 flex flex-col overflow-hidden py-1">
                        <p className="reveal-mask text-black/80 group-hover:text-black transition-colors duration-500 leading-relaxed font-medium text-base md:text-lg lg:text-xl">
                          {benefit.description}
                        </p>
                     </div>
                   </div>
                 );
              })}
           </div>
        </div>
      </div>
    </section>
  );
}
