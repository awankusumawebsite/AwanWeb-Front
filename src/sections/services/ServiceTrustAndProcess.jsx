"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { MessageSquare, FileText, Settings, CheckCircle } from "lucide-react";

const defaultCopy = {
  kicker: "Alur Kerja",
  titleHtml: 'Semudah <br /><span class="text-white">4 Langkah</span>',
  description: "Proses yang sederhana, transparan, dan tanpa ribet. Kami yang mengurus kompleksitas birokrasi, Anda yang fokus mengembangkan bisnis.",
  clients: "Klien Terlayani",
  processingTime: "Hari Kerja Proses",
  officialNotary: "Notaris Resmi",
  free: "Gratis",
  initialConsultation: "Konsultasi Awal",
  steps: [
    { title: "Konsultasi Gratis", description: "Diskusikan kebutuhan bisnis Anda dengan tim ahli kami." },
    { title: "Lengkapi Dokumen", description: "Serahkan dokumen yang dibutuhkan secara online." },
    { title: "Proses Pengurusan", description: "Tim legal kami akan mengurus semua proses ke instansi." },
    { title: "Dokumen Selesai", description: "Dokumen resmi siap dan langsung dikirim ke Anda." },
  ],
};

const fallbackIcons = [MessageSquare, FileText, Settings, CheckCircle];

/**
 * Sanitize HTML string — hanya izinkan tag formatting aman (br, span).
 * Mencegah stored XSS dari CMS content.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  // Strip semua tags kecuali br dan span (untuk styling)
  return html
    .replace(/<(?!\/?(?:br|span)\b)[^>]+>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}

export default function ServiceTrustAndProcess({ theme = "light", data = {}, copy = defaultCopy }) {
  const labels = { ...defaultCopy, ...copy };
  const defaultSteps = labels.steps.map((step, index) => ({
    ...step,
    icon: fallbackIcons[index % fallbackIcons.length],
  }));
  const containerRef = useRef(null);
  const trustRef = useRef(null);
  const processRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 2. Trust Signals Animation
      gsap.fromTo(
        ".trust-stat",
        { opacity: 0, scale: 0.8, y: 20 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "back.out(1.2)",
          scrollTrigger: {
            trigger: trustRef.current,
            start: "top 85%",
          },
        }
      );

      // Section Title Animation
      gsap.fromTo(
        ".section-title-anim",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: processRef.current,
            start: "top 85%",
          },
        }
      );

      // 3. Process Steps Animation
      gsap.fromTo(
        ".process-item",
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: processRef.current,
            start: "top 80%",
          },
        }
      );
      
      // 4. Connecting line animation (Fill scrub)
      gsap.fromTo(
        ".process-line-fill",
        { height: "0%" },
        {
          height: "100%",
          duration: 1.5,
          ease: "none",
          scrollTrigger: {
            trigger: processRef.current,
            start: "top 75%",
            end: "bottom 60%",
            scrub: 1,
          },
        }
      );
      // 5. Active state scroll trigger for items
      const processItems = gsap.utils.toArray(".process-item");
      processItems.forEach((item) => {
        ScrollTrigger.create({
          trigger: item,
          start: "top 65%", // When the dot hits 65% height, line reaches it
          end: "bottom -3000px", // Keep it active as long as we scroll down
          toggleClass: "is-active",
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative w-full z-10 py-10 md:py-16 lg:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 relative z-10">
        
        {/* PROCESS SECTION */}
        <div ref={processRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Section Title & Trust Signals */}
            <div className="lg:col-span-12 xl:col-span-5 sticky top-10 flex flex-col justify-between">
              <div className="section-title-anim">
                <div className={`inline-flex items-center gap-3 mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-elm'}`}>
                  <span className={`w-2 h-2 rotate-45 shrink-0 ${theme === 'dark' ? 'bg-slate-300' : 'bg-elm'}`} />
                  <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-big-stone'}`}>
                    {labels.kicker}
                  </span>
                </div>
                <h2 
                  className={`text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-5 transition-colors duration-1000 ${theme === 'dark' ? 'text-slate-300' : 'text-big-stone'}`}
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(data?.workflow_title) || sanitizeHtml(labels.titleHtml)
                  }}
                />
                <p className={`text-base lg:text-lg leading-relaxed max-w-lg mb-10 xl:mb-16 transition-colors duration-1000 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {labels.description}
                </p>
              </div>

              {/* TRUST SIGNALS SECTION */}
              <div ref={trustRef} className="grid grid-cols-2 gap-6 md:gap-8 mt-auto xl:mt-8 pt-8 border-t border-slate-200/20">
                {/* Dynamic trust signals if data exists, otherwise fallback */}
                <div className="trust-stat flex flex-col gap-1.5 border-l-[3px] border-elm/30 pl-4 lg:pl-5">
                  <span className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter transition-colors duration-1000 ${theme === 'dark' ? 'text-white' : 'text-big-stone'}`}>
                    {data?.clients_count ? `${data.clients_count}+` : "500+"}
                  </span>
                  <span className={`text-xs md:text-sm font-bold uppercase tracking-widest mt-1 transition-colors duration-1000 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {labels.clients}
                  </span>
                </div>
                <div className="trust-stat flex flex-col gap-1.5 border-l-[3px] border-elm/30 pl-4 lg:pl-5">
                  <span className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter transition-colors duration-1000 ${theme === 'dark' ? 'text-white' : 'text-big-stone'}`}>
                    {data?.processing_time || "7-10"}
                  </span>
                  <span className={`text-xs md:text-sm font-bold uppercase tracking-widest mt-1 transition-colors duration-1000 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {labels.processingTime}
                  </span>
                </div>
                <div className="trust-stat flex flex-col gap-1.5 border-l-[3px] border-elm/30 pl-4 lg:pl-5">
                  <span className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter transition-colors duration-1000 ${theme === 'dark' ? 'text-white' : 'text-big-stone'}`}>
                    100%
                  </span>
                  <span className={`text-xs md:text-sm font-bold uppercase tracking-widest mt-1 transition-colors duration-1000 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {labels.officialNotary}
                  </span>
                </div>
                <div className="trust-stat flex flex-col gap-1.5 border-l-[3px] border-elm/30 pl-4 lg:pl-5">
                  <span className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter transition-colors duration-1000 ${theme === 'dark' ? 'text-white' : 'text-big-stone'}`}>
                    {labels.free}
                  </span>
                  <span className={`text-xs md:text-sm font-bold uppercase tracking-widest mt-1 transition-colors duration-1000 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {labels.initialConsultation}
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Timeline Steps */}
            <div className="lg:col-span-12 xl:col-span-7 relative pl-8 md:pl-10 mt-10 xl:mt-0">
              {/* Timeline Line */}
              <div className={`absolute left-0 top-6 bottom-12 w-[3px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div className={`process-line-fill w-full ${theme === 'dark' ? 'bg-white' : 'bg-elm'}`} />
              </div>

              <div className="flex flex-col gap-10 lg:gap-12">
                {(data?.workflows?.length > 0 ? data.workflows : defaultSteps).map((step, idx) => {
                  const Icon = step.icon || fallbackIcons[idx % fallbackIcons.length];
                  const number = String(idx + 1).padStart(2, "0");
                  return (
                    <div key={idx} className="process-item relative group">
                      {/* Node Dot */}
                      <div className={`absolute -left-[38.5px] md:-left-[46.5px] top-5 w-4 h-4 rounded-full border-2 transition-all duration-500 z-10 shadow-sm
                        ${theme === 'dark' 
                          ? 'bg-[#0f172a] border-slate-700 group-hover:border-white group-[.is-active]:border-white group-hover:bg-white group-[.is-active]:bg-white' 
                          : 'bg-white border-slate-300 group-hover:border-elm group-[.is-active]:border-elm group-hover:bg-white group-[.is-active]:bg-white'} 
                        group-hover:scale-125 group-[.is-active]:scale-125`} 
                      />
                      
                      <div className="flex gap-6 md:gap-8 items-start">
                        {/* Large Transparent Number */}
                        <span className={`text-6xl md:text-8xl font-black mb-1 lg:mb-2 tracking-tighter transition-all duration-500 
                          ${theme === 'dark' 
                            ? 'text-slate-800 opacity-60 group-hover:opacity-80 group-[.is-active]:opacity-80 group-hover:text-slate-700 group-[.is-active]:text-slate-700' 
                            : 'text-slate-400 opacity-20 group-hover:opacity-30 group-[.is-active]:opacity-30 group-hover:text-elm group-[.is-active]:text-elm'}`}>
                          {number}
                        </span>
                        
                        <div className="pt-2 md:pt-4 flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-md transition-all duration-300 
                              ${theme === 'dark' 
                                ? 'bg-slate-800/80 border-slate-700 group-hover:border-slate-500 group-[.is-active]:border-slate-500 group-hover:bg-slate-800 group-[.is-active]:bg-slate-800' 
                                : 'bg-white border-slate-200 group-hover:border-elm/30 group-[.is-active]:border-elm/30'}`}>
                              <Icon className={`w-5 h-5 transition-colors duration-300 
                                ${theme === 'dark' 
                                  ? 'text-slate-500 group-hover:text-white group-[.is-active]:text-white' 
                                  : 'text-slate-500 group-hover:text-elm group-[.is-active]:text-elm'}`} />
                            </div>
                            <h3 className={`text-xl md:text-2xl font-extrabold tracking-tight uppercase transition-colors duration-300 
                              ${theme === 'dark' 
                                ? 'text-slate-400 group-hover:text-white group-[.is-active]:text-white' 
                                : 'text-big-stone group-hover:text-elm group-[.is-active]:text-elm'}`}>
                              {step.title}
                            </h3>
                          </div>
                          <p className={`text-sm md:text-base leading-relaxed pl-[4rem] transition-colors duration-1000 
                            ${theme === 'dark' ? 'text-slate-500 group-[.is-active]:text-slate-300' : 'text-slate-600'}`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

        </div>

      </div>
    </section>
  );
}
