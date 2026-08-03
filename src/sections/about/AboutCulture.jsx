"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import HeadingReveal from "@/components/animations/HeadingReveal";

const philosophyImages = [
  "/images/mockups/photo-1542626991-cbc4e32524cc.webp",
  "/images/mockups/photo-1600880292203-757bb62b4baf.webp",
  "/images/mockups/photo-1497215728101-856f4ea42174.webp"
];

export default function AboutCulture() {
  const t = useTranslations("aboutCulture");
  
  const philosophies = philosophyImages.map((image, index) => ({
    title: t(`philosophies.${index + 1}.title`),
    desc: t(`philosophies.${index + 1}.desc`),
    image
  }));
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Reveal the cards smoothly one by one
      gsap.utils.toArray(".philosophy-card").forEach((card, i) => {
        gsap.fromTo(card, 
          { y: 50, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 1.2,
            delay: i * 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
            }
          }
        );
      });
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <section id="culture" ref={containerRef} className="relative w-full pt-20 pb-40 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 flex flex-col items-center">
        
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center text-center mb-12 md:mb-16 max-w-5xl">
          <HeadingReveal
            text={t("heading")}
            as="h2"
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-big-stone leading-none mb-6 text-balance"
          />
          <p className="text-sm md:text-base text-slate-500 max-w-2xl text-center leading-relaxed font-medium mt-1">
            {t("description")}
          </p>
        </div>

        {/* Expanding Accordion Container */}
        <div className="w-full flex flex-col xl:flex-row h-[800px] xl:h-[600px] gap-4 rounded-3xl overflow-hidden">
          {philosophies.map((item, idx) => {
            const isActive = activeIndex === idx;

            return (
              <div 
                key={idx}
                className={`philosophy-card relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group ${
                  isActive ? "flex-[5_5_0%] xl:flex-[5_5_0%]" : "flex-[1_1_0%] xl:flex-[1_1_0%] xl:opacity-75 hover:opacity-100"
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => setActiveIndex(idx)}
              >
                {/* Background Image */}
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 1280px) 100vw, 33vw"
                  className={`object-cover transition-transform duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isActive ? "scale-100 grayscale-0" : "scale-110 grayscale"
                  }`}
                />
                
                {/* Overlay Gradient */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isActive ? "from-black/90 via-black/40 to-transparent opacity-100" : "from-black/80 via-black/20 to-transparent opacity-100"
                  }`}
                ></div>
                
                {/* LAYER 1: INACTIVE TEXT (Vertical Text) */}
                <div 
                  className={`absolute inset-0 flex flex-col items-center justify-end pb-8 xl:pb-12 transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
                    isActive ? "opacity-0 scale-90 translate-y-8" : "opacity-100 scale-100 translate-y-0"
                  }`}
                >
                  <h3 
                    className="text-white font-black tracking-widest uppercase text-2xl xl:text-3xl whitespace-nowrap drop-shadow-lg"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    {item.title}
                  </h3>
                </div>

                {/* LAYER 2: ACTIVE TEXT (Horizontal Text + Description) */}
                <div 
                  className={`absolute left-0 bottom-0 p-6 md:p-8 xl:p-12 flex flex-col justify-end transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none h-full w-full xl:w-[800px] ${
                    isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                  }`}
                >
                  <div className="w-full max-w-2xl">
                     <h3 className="text-white font-black tracking-wide uppercase text-3xl md:text-4xl xl:text-5xl mb-3 xl:mb-5 drop-shadow-lg whitespace-nowrap">
                       {item.title}
                     </h3>
                     <p className="text-white/95 text-[15px] sm:text-base xl:text-lg leading-relaxed font-medium drop-shadow-md">
                       {item.desc}
                     </p>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
