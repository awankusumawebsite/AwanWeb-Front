"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import HeadingReveal from "@/components/animations/HeadingReveal";
import SplitTextReveal from "@/components/animations/SplitTextReveal";

export default function AboutIntro() {
  const t = useTranslations("aboutIntro");
  return (
    <section className="w-full relative z-10 pt-32 pb-20 bg-white">
      {/* Top light background block for aesthetic contrast */}
      <div className="absolute top-0 left-0 w-full h-[45%] bg-elm/10 z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        
        {/* Header Section */}
        <div className="flex flex-col items-start mb-12 md:mb-16">
          <HeadingReveal 
            text={t("heading")}
            as="h1"
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-big-stone max-w-4xl leading-[1.1] pb-3"
          />
          <span className="text-xs md:text-sm font-extrabold text-elm tracking-widest uppercase z-10 relative">
            {t("subheading")}
          </span>
        </div>

        {/* Massive Hero Image */}
        <div className="w-full aspect-video md:aspect-21/9 rounded-xl overflow-hidden relative shadow-[0_30px_60px_rgba(0,0,0,0.08)] mb-16 md:mb-24 group">
          <Image 
            src="/assets/image/about_hero.webp"
            alt="Awan Kusuma Legalitas Office"
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            priority
            fetchPriority="high"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent"></div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-10 md:gap-16">
          <div className="w-full md:w-5/12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-big-stone leading-snug tracking-normal">
              <SplitTextReveal 
                text={t("contentHeading")} 
                triggerOnScroll={true} 
                scrollStart="top 70%" 
              />
            </h2>
          </div>
          <div className="w-full md:w-7/12 flex flex-col gap-6 text-slate-600 text-base md:text-lg leading-relaxed">
            <p>
              {t("paragraph1")}
            </p>
            <p>
              {t("paragraph2")}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
