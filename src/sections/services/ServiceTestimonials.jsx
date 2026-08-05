"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

/**
 * @param {{
 *   testimonials?: Array<{ name: string; role?: string | null; quote: string; avatar?: string | null }>;
 *   serviceName?: string;
 * }} props
 */
export default function ServiceTestimonials({ testimonials = [], serviceName = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || testimonials.length === 0) return;

    const ctx = gsap.context(() => {
      // 1. Entrance animation for the heading
      gsap.fromTo(
        ".st-heading > *",
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          }
        }
      );
      
    }, containerRef);

    return () => ctx.revert();
  }, [testimonials]);

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section 
      ref={containerRef} 
      className="relative w-full z-10 py-16 md:py-24 bg-slate-50 st-wrapper overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header */}
        <div className="st-heading text-center mb-16 md:mb-20 flex flex-col items-center relative z-10">
          <div className="inline-flex items-center gap-3 text-elm mb-4">
            <span className="w-2 h-2 bg-elm rotate-45 shrink-0" />
            <span className="text-[11px] font-black tracking-[0.2em] uppercase text-big-stone">
              Suara Klien
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-big-stone tracking-tight leading-[1.05]">
            Bukti Nyata <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-elm">Kepercayaan</span>
          </h2>
          <p className="mt-5 text-slate-500 font-medium text-base lg:text-lg max-w-2xl text-center">
            Pengalaman langsung klien yang telah menggunakan layanan {serviceName}.
          </p>
        </div>

        {/* Swiper Container */}
        <div className="relative w-full relative z-10">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
              768: { slidesPerView: 1.5, centeredSlides: true },
              1024: { slidesPerView: 2, centeredSlides: false },
            }}
            loop={true}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
             pagination={{
              clickable: true,
              el: '.st-pagination',
              bulletClass: 'swiper-custom-bullet',
              bulletActiveClass: 'swiper-custom-bullet-active',
            }}
            navigation={{
              prevEl: '.st-nav-prev',
              nextEl: '.st-nav-next',
            }}
            className="!pb-12 !pt-4 !px-4 -mx-4"
          >
            {testimonials.map((item, idx) => {
              const isElm = idx % 2 !== 0; 
              
              return (
                <SwiperSlide key={idx} className="h-auto">
                  <div 
                    className={`st-card h-full flex flex-col rounded-[2.5rem] p-8 md:p-12 lg:p-14 border overflow-hidden transition-all duration-500 hover:-translate-y-2 relative ${
                      isElm 
                      ? 'bg-elm border-white/20 shadow-[0_20px_40px_-15px_rgba(1,164,151,0.3)] text-white hover:shadow-[0_30px_60px_-15px_rgba(1,164,151,0.4)]' 
                      : 'bg-white border-slate-200 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.05)] text-big-stone hover:shadow-[0_30px_60px_-15px_rgba(15,23,42,0.1)]'
                    }`}
                  >
                    {/* Noise texture removed — feTurbulence + mix-blend-overlay at 0.04 opacity */}
                    {/* created expensive compositing layers per slide with zero visual impact */}

                    {/* Decorative Giant Quote */}
                    <div className={`absolute -top-4 -right-2 text-[140px] md:text-[200px] leading-none opacity-[0.04] font-serif font-black select-none pointer-events-none ${isElm ? 'text-white' : 'text-slate-900'}`}>
                      &quot;
                    </div>

                    {/* Quote Content */}
                    <div className="relative z-10 flex-1 flex mb-8 md:mb-12 mt-2">
                       <p className={`text-xl md:text-2xl font-medium leading-relaxed tracking-tight ${isElm ? 'text-white' : 'text-slate-700'}`}>
                        &quot;{item.quote}&quot;
                       </p>
                    </div>

                    {/* User Identity */}
                    <div className={`relative z-10 flex items-center justify-between w-full mt-auto pt-6 border-t ${isElm ? 'border-white/20' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden shrink-0 border-2 ${isElm ? 'border-white/30' : 'border-slate-200'} relative`}>
                          {item.avatar ? (
                            <Image 
                              src={item.avatar} 
                              alt={item.name} 
                              fill 
                              sizes="(max-width: 768px) 48px, 56px" 
                              className="object-cover" 
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-bold text-lg uppercase ${isElm ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {item.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className={`text-base md:text-lg font-bold tracking-tight ${isElm ? 'text-white' : 'text-big-stone'}`}>{item.name}</h3>
                          <p className={`text-sm font-medium mt-0.5 ${isElm ? 'text-white/80' : 'text-slate-500'}`}>{item.role}</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Navigation & Pagination Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between mt-6 px-4 gap-6">
             {/* Custom Pagination */}
             <div className="st-pagination flex items-center justify-center gap-2"></div>
             
             {/* Custom Navigation */}
             <div className="flex items-center gap-3">
               <button aria-label="Testimonial sebelumnya" className="st-nav-prev w-12 h-12 rounded-full flex items-center justify-center text-white bg-big-stone hover:bg-elm hover:-translate-y-0.5 transition-all outline-none focus:outline-none shadow-md hover:shadow-lg">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
               </button>
               <button aria-label="Testimonial berikutnya" className="st-nav-next w-12 h-12 rounded-full flex items-center justify-center text-white bg-big-stone hover:bg-elm hover:-translate-y-0.5 transition-all outline-none focus:outline-none shadow-md hover:shadow-lg">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
               </button>
             </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}
