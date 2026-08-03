"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import HeadingReveal from "@/components/animations/HeadingReveal";

const uspImages = [
  "/images/mockups/photo-1589829085413-56de8ae18c73.webp",
  "/images/mockups/photo-1454165804606-c3d57bc86b40.webp",
  "/images/mockups/photo-1522071820081-009f0129c71c.webp",
  "/images/mockups/photo-1600880292203-757bb62b4baf.webp",
  "/images/mockups/photo-1542744173-8e7e53415bb0.webp",
  "/images/mockups/photo-1552664730-d307ca884978.webp",
  "/images/mockups/photo-1554224155-8d04cb21cd6c.webp"
];

export default function AboutWhyAwanKusuma() {
  const t = useTranslations("aboutWhyUs");
  
  const usps = uspImages.map((image, index) => ({
    num: `0${index + 1}`,
    title: t(`usps.${index + 1}.title`),
    desc: t(`usps.${index + 1}.desc`),
    image
  }));
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Create mm (matchMedia) context for responsive GSAP
      let mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        // Desktop horizontal scroll
        const sections = gsap.utils.toArray(".why-card");
        gsap.to(sections, {
          xPercent: -100 * (sections.length - 1),
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            pin: true,
            scrub: 1,
            snap: 1 / (sections.length - 1),
            end: () => "+=" + scrollRef.current.offsetWidth,
          }
        });
      });
      
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <section id="why-us" ref={containerRef} className="lg:h-screen w-full bg-white overflow-hidden flex flex-col lg:flex-row relative z-10 py-16 lg:py-0">
      
      {/* Target Sticky Left Content (Only sticky on Desktop) */}
      <div className="w-full lg:absolute lg:top-0 left-0 lg:w-[42%] lg:h-full lg:bg-white flex flex-col justify-center px-6 md:px-12 lg:pl-16 lg:pr-12 xl:pl-20 z-20 mb-8 lg:mb-0 lg:pointer-events-none">
        
        {/* Aesthetic Curved Divider */}
        <div className="hidden lg:flex absolute top-0 -right-[4vw] w-[4vw] h-full overflow-visible pointer-events-none z-1 drop-shadow-[15px_0_15px_rgba(0,0,0,0.03)] items-stretch">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-[102%] h-full text-white">
            <path d="M0,0 C100,0 100,100 0,100 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Frosted Glass Transition for Cards */}
        <div 
          className="hidden lg:block absolute top-0 -right-[20vw] w-[20vw] h-full pointer-events-none z-0 "
          style={{ 
            WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
            maskImage: 'linear-gradient(to right, black 0%, transparent 100%)'
           }}
        ></div>
        <HeadingReveal 
          text={t("heading")}
          as="h2"
          className="text-2xl md:text-3xl lg:text-[2.5rem] font-black tracking-tight text-big-stone leading-[1.15] mb-4"
        />
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-extrabold text-elm tracking-widest uppercase">
            {t("contentHeading")}
          </span>
        </div>
        <p className="mt-4 text-slate-500 text-base lg:text-lg leading-relaxed max-w-sm">
          {t("description")}
        </p>
      </div>

      {/* Horizontal Scroll Area (Desktop) / Vertical Stack (Mobile) */}
      <div className="flex flex-col lg:flex-row h-full items-center lg:ml-[42%] w-full lg:w-[220vw] relative z-10 gap-8 lg:gap-0 mt-8 lg:mt-0" ref={scrollRef}>
        {usps.map((usp, i) => (
          <div key={i} className="why-card w-full lg:w-[55vw] lg:h-full flex flex-col justify-center px-6 md:px-12 lg:px-16 relative shrink-0">
            <div className="bg-white rounded-3xl p-6 md:p-8 lg:p-10 w-full shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col xl:flex-row gap-6 lg:gap-8 items-center group transition-colors duration-500 hover:border-elm/30">
              
              <div className="w-full xl:w-5/12 relative aspect-4/3 xl:aspect-[1/1.1] rounded-2xl overflow-hidden shrink-0">
                <Image 
                  src={usp.image}
                  alt={usp.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              <div className="w-full xl:w-7/12 flex flex-col justify-center">
                <span className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-100 mb-1 lg:mb-2 tracking-tighter transition-colors duration-500 group-hover:text-elm/15">
                  {usp.num}
                </span>
                <h3 className="text-xl md:text-2xl lg:text-[1.75rem] font-extrabold text-black mb-2 lg:mb-3 tracking-tight uppercase group-hover:text-elm transition-colors duration-300">
                  {usp.title}
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                  {usp.desc}
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
