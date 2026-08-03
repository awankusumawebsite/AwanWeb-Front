"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import HeadingReveal from "@/components/animations/HeadingReveal";

export default function AboutVisiMisi() {
  const t = useTranslations("aboutVisiMisi");
  const containerRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "bottom 10%", 
          scrub: true,
        }
      });

      tl.fromTo(bgRef.current, 
        { scale: 0.95 },
        { scale: 1, duration: 0.15, ease: "power1.inOut" }
      )
      .to(bgRef.current, { duration: 0.7 })
      .to(bgRef.current, 
        { scale: 0.95, duration: 0.15, ease: "power1.inOut" }
      );

      let mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        gsap.to(".visi-column", {
          y: () => {
            const grid = document.querySelector(".visi-misi-grid");
            const col = document.querySelector(".visi-column");
            if (!grid || !col) return 0;
            return Math.max(0, grid.offsetHeight - col.offsetHeight);
          },
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          }
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="visi-misi" ref={containerRef} className="relative w-full z-10 py-12 lg:py-0 overflow-hidden">
       {/* Animated Background Wrapper with Content inside */}
       <div 
         ref={bgRef}
         className="w-full origin-center overflow-hidden rounded-[40px]"
         style={{ background: "linear-gradient(160deg, #dff0f5 0%, #f5f7f8 40%, #e0edf5 100%)" }}
       >
         <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 visi-misi-grid">
            
            {/* GSAP Emulated Sticky Left Column: Visi */}
            <div className="visi-column lg:py-32 py-16 lg:h-screen flex flex-col justify-center">
             <HeadingReveal 
               text={t("heading")} 
               as="h2" 
               className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-big-stone leading-[1.1] mb-4" 
             />

             <div className="flex items-center gap-2 mb-6">
               <h4 className="text-xs md:text-sm font-extrabold text-elm tracking-widest uppercase">
                 {t("visiLabel")}
               </h4>
             </div>
             <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
               {t("visiText")}
             </p>
          </div>

          {/* Scrolling Right Column: Misi Items */}
          <div className="lg:py-32 pb-16 lg:pb-32 flex flex-col gap-12 md:gap-24">
             {/* Misi 1 */}
              <div className="flex flex-col gap-6">
                <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden shadow-xl">
                  <Image src="/images/mockups/photo-1552664730-d307ca884978.webp" fill loading="lazy" sizes="(max-width: 1024px) 100vw, 50vw" alt="Layanan hukum dan legalitas profesional yang andal" className="object-cover" />
                </div>
                <div>
                  <span className="text-xl font-black text-elm/50 tracking-widest block mb-2">{t("misi1Title")}</span>
                  <p className="text-base text-slate-600 leading-relaxed">{t("misi1Desc")}</p>
                </div>
              </div>

              {/* Misi 2 */}
              <div className="flex flex-col gap-6">
                <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden shadow-xl">
                  <Image src="/images/mockups/photo-1600880292203-757bb62b4baf.webp" fill loading="lazy" sizes="(max-width: 1024px) 100vw, 50vw" alt="Proses kerja transparan dan edukatif bagi klien" className="object-cover" />
                </div>
                <div>
                  <span className="text-xl font-black text-elm/50 tracking-widest block mb-2">{t("misi2Title")}</span>
                  <p className="text-base text-slate-600 leading-relaxed">{t("misi2Desc")}</p>
                </div>
              </div>

             {/* Misi 3 */}
              <div className="flex flex-col gap-6">
                <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden shadow-xl">
                  <Image src="/images/mockups/photo-1454165804606-c3d57bc86b40.webp" fill loading="lazy" sizes="(max-width: 1024px) 100vw, 50vw" alt="Inovasi teknologi dalam pelayanan dokumen legalitas" className="object-cover" />
                </div>
                <div>
                  <span className="text-xl font-black text-elm/50 tracking-widest block mb-2">{t("misi3Title")}</span>
                  <p className="text-base text-slate-600 leading-relaxed">{t("misi3Desc")}</p>
                </div>
              </div>

              {/* Misi 4 */}
              <div className="flex flex-col gap-6">
                <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden shadow-xl">
                  <Image src="/images/mockups/photo-1600880292203-757bb62b4baf.webp" fill loading="lazy" sizes="(max-width: 1024px) 100vw, 50vw" alt="Ekosistem bisnis yang mematuhi regulasi dan mendukung pertumbuhan" className="object-cover" />
                </div>
                <div>
                  <span className="text-xl font-black text-elm/50 tracking-widest block mb-2">{t("misi4Title")}</span>
                  <p className="text-base text-slate-600 leading-relaxed">{t("misi4Desc")}</p>
                </div>
              </div>
          </div>

        </div>
      </div>
    </section>
  );
}
