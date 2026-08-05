"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const defaultCopy = {
  unavailable: "Informasi harga untuk layanan ini sedang disiapkan.",
  title: "Pilih Paket Kebutuhan",
  description: "Transparan, tanpa biaya tersembunyi. Mulailah perjalanan bisnis Anda dengan fondasi legalitas yang kokoh bersama tim Awan Kusuma.",
  priceFeatures: "Harga & Fitur",
  requirements: "Syarat Dokumen",
  popular: "Paling Populer",
  generalRequirements: "Persyaratan Umum",
  requirementsFallback: "Hubungi kami untuk detail persyaratan.",
  orderNow: "Pesan Sekarang",
  whatsappTemplate: "Halo Awan Kusuma Legalitas! 👋 Saya tertarik dengan paket *{package}*{servicePart}. Bisa konsultasi lebih lanjut?",
  whatsappServiceTemplate: " untuk layanan *{service}*",
};


/**
 * @param {{
 *   data: { packages: Array<Record<string, any>> };
 *   title?: string | null;
 *   description?: string | null;
 *   serviceName?: string;
 *   whatsappNumber?: string;
 *   theme?: string;
 *   copy?: Record<string, any>;
 * }} props
 */
export default function ServicePricingSection({ data, title = null, description = null, serviceName = "", whatsappNumber = "6285159358044", theme = "light", copy = defaultCopy }) {
  const labels = { ...defaultCopy, ...copy };
  const [activeTab, setActiveTab] = useState("harga"); // 'harga' | 'syarat'
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.packages) return;
    
    const ctx = gsap.context(() => {
      // Set initial state
      gsap.set(".pricing-header", { opacity: 0, y: 30 });
      gsap.set(".pricing-toggle", { opacity: 0, scale: 0.95 });
      gsap.set(".pricing-card", { opacity: 0, y: 50 });

      // Create scroll trigger
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 85%",
        onEnter: () => {
          const tl = gsap.timeline();
          
          tl.to(".pricing-header", {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out"
          })
          .to(".pricing-toggle", {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: "back.out(1.5)"
          }, "-=0.4")
          .to(".pricing-card", {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "power3.out",
            clearProps: "transform" // allow hover effects to work after animation
          }, "-=0.3");
        },
        once: true
      });
    }, containerRef);

    return () => ctx.revert();
  }, [data]);

  // Jika tidak ada data pricing spesifik, sembunyikan section ini atau berikan fallback
  if (!data || !data.packages) {
    return (
      <section className="py-24 px-6 lg:px-12 w-full text-center">
        <p className="text-slate-400">{labels.unavailable}</p>
      </section>
    );
  }

  return (
    <section 
      ref={containerRef} 
      className={`py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 transition-colors duration-1000 ${theme === 'dark' ? 'bg-transparent' : 'bg-white'}`}
    >
      
      <div className="text-center mb-16 pricing-header">
        <h2 className={`text-3xl md:text-5xl font-black tracking-tight mb-6 uppercase transition-colors duration-1000 ${theme === 'dark' ? 'text-white' : 'text-big-stone'}`}>
          {title || labels.title}
        </h2>
        <p className={`max-w-2xl mx-auto text-lg leading-relaxed transition-colors duration-1000 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
          {description || labels.description}
        </p>
      </div>

      {/* Segmented Control Toggle (Mac-OS Style) */}
      <div className={`pricing-toggle relative flex items-center p-1.5 rounded-full w-fit mx-auto mb-16 shadow-inner border transition-colors duration-1000 ${theme === 'dark' ? 'bg-[#1e293b]/70 border-[#334155]/50' : 'bg-slate-100/80 border-slate-200/50'}`}>
        
        {/* Animated Background Slider */}
        <div 
          className="absolute top-1.5 bottom-1.5 w-[150px] bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-500 ease-out z-0"
          style={{ transform: activeTab === 'harga' ? 'translateX(0)' : 'translateX(100%)' }}
        />
        
        <button 
          onClick={() => setActiveTab('harga')}
          className={`relative z-10 w-[150px] py-3 text-[12px] tracking-[0.15em] uppercase font-extrabold transition-colors duration-300 ${activeTab === 'harga' ? 'text-elm' : (theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-slate-600')}`}
        >
          {labels.priceFeatures}
        </button>
        
        <button 
          onClick={() => setActiveTab('syarat')}
          className={`relative z-10 w-[150px] py-3 text-[12px] tracking-[0.15em] uppercase font-extrabold transition-colors duration-300 ${activeTab === 'syarat' ? 'text-elm' : (theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-slate-600')}`}
        >
          {labels.requirements}
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div className={`grid grid-cols-1 gap-8 items-center mx-auto ${
        data.packages.length === 1 ? 'max-w-md' :
        data.packages.length === 2 ? 'md:grid-cols-2 max-w-4xl' :
        'md:grid-cols-2 lg:grid-cols-3 max-w-6xl'
      }`}>
        {data.packages.map((pkg, idx) => {
          const isPopular = pkg.isPopular;
          return (
            <div 
              key={idx} 
              className={`pricing-card relative bg-white rounded-[2.5rem] p-8 lg:p-10 transition-shadow duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col h-full ${
                isPopular 
                  ? "border-2 border-elm shadow-xl lg:-translate-y-4 z-10" 
                  : "border border-slate-100 shadow-sm z-0 hover:-translate-y-2"
              }`}
            >
              {/* Badge (Custom or Popular) */}
              {(pkg.badge || isPopular) && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-[10px] font-black tracking-widest uppercase py-1.5 px-5 rounded-full shadow-md whitespace-nowrap">
                  {pkg.badge || labels.popular}
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-lg font-extrabold text-slate-800 mb-2 uppercase tracking-wide">{pkg.name}</h3>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-big-stone tracking-tighter mb-4 flex items-baseline gap-1 whitespace-nowrap">
                  {String(pkg.price).startsWith("Rp") ? (
                    <>
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-400 tracking-normal">Rp</span>
                      <span>{pkg.price.replace(/Rp\s*/, "").replace(/,00$/, "")}</span>
                    </>
                  ) : (
                    <span>{String(pkg.price).replace(/,00$/, "")}</span>
                  )}
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed min-h-[40px]">
                  {pkg.description}
                </p>
              </div>

              {/* Dynamic Content: Crossfade Area */}
              <div className="relative flex-1 min-h-[220px]">
                
                {/* Tab: Harga & Fitur */}
                <div className={`absolute top-0 left-0 w-full transition-all duration-500 ease-out ${activeTab === 'harga' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute pointer-events-none'}`}>
                  <ul className="flex flex-col gap-3.5">
                    {pkg.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-elm shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="text-[14px] text-slate-600 leading-relaxed font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tab: Syarat */}
                <div className={`absolute top-0 left-0 w-full transition-all duration-500 ease-out ${activeTab === 'syarat' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute pointer-events-none'}`}>
                  {isPopular ? (
                     <div className="mb-4 inline-block px-3 py-1 bg-orange-50 text-orange-600 font-bold text-[10px] tracking-widest uppercase rounded-md">{labels.generalRequirements}</div>
                  ) : null}
                  <ul className="flex flex-col gap-3.5">
                     {(pkg.requirements || data.requirements) ? (pkg.requirements || data.requirements).map((req, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-3">
                        <FileText size={18} className="text-orange-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="text-[14px] text-slate-600 leading-relaxed font-medium">{req}</span>
                      </li>
                    )) : (
                      <li className="text-sm text-slate-400">{labels.requirementsFallback}</li>
                    )}
                  </ul>
                </div>

              </div>
              
              {/* CTA Button */}
              <div className="pt-8 mt-auto border-t border-slate-100">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    labels.whatsappTemplate
                      .replace("{package}", pkg.name)
                      .replace(
                        "{servicePart}",
                        serviceName ? labels.whatsappServiceTemplate.replace("{service}", serviceName) : ""
                      )
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full py-4 rounded-full font-extrabold text-[13px] tracking-widest uppercase transition-all duration-300 text-center ${
                    isPopular 
                      ? "bg-elm text-white hover:bg-big-stone shadow-lg hover:shadow-xl hover:-translate-y-1" 
                      : "bg-slate-50 text-slate-600 hover:bg-elm hover:text-white"
                  }`}
                >
                  {labels.orderNow}
                </a>
              </div>
            </div>
          );
        })}
      </div>
      
    </section>
  );
}
