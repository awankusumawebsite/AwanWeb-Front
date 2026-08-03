"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { useTranslations } from "next-intl";


const CustomSelect = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      gsap.fromTo(listRef.current, 
        { opacity: 0, y: -10, scale: 0.95 }, 
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
      );
      gsap.fromTo(".option-item", 
        { opacity: 0, x: -10 }, 
        { opacity: 1, x: 0, duration: 0.2, stagger: 0.05, delay: 0.1, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  const t = useTranslations("kontakHero");
  const selectedLabel = options.find(opt => opt.value === value)?.label || t("formPlaceholders.serviceDefault");

  return (
    <div ref={containerRef} className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border-b border-slate-200 pt-6 pb-2 text-[15px] text-slate-800 bg-transparent cursor-pointer flex justify-between items-center group/select"
      >
        <span className={`${value ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>{selectedLabel}</span>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-elm' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <label className={`absolute left-0 text-[10px] tracking-widest uppercase font-black transition-all duration-300 pointer-events-none ${isOpen || value ? 'top-0 text-elm' : 'top-4 text-slate-400'}`}>
        {label}
      </label>

      {isOpen && (
        <ul 
          ref={listRef}
          className="absolute z-[100] left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-y-auto overscroll-contain touch-pan-y max-h-[250px] py-2" data-lenis-prevent
        >
          {options.map((option, idx) => (
            <li 
              key={idx}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`option-item group flex items-center justify-between px-6 py-3.5 text-sm font-bold cursor-pointer transition-colors duration-200 ${value === option.value ? 'bg-elm/5 text-elm' : 'text-slate-600 hover:bg-slate-50 hover:text-elm'}`}
            >
              <span>{option.label}</span>
              {value === option.value ? (
                <svg className="w-4 h-4 text-elm shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-300 group-hover:text-elm group-hover:translate-x-0.5 transition-all duration-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const InputField = ({ label, id, type = "text", value, onChange, required }) => (
  <div className="relative w-full group">
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder=" "
      className="peer w-full border-b border-slate-200 pt-6 pb-2 text-[15px] text-slate-800 bg-transparent focus:outline-none focus:border-elm transition-colors duration-300 placeholder-transparent font-medium"
    />
    <label
      htmlFor={id}
      className="absolute top-0 left-0 text-[10px] tracking-widest uppercase font-black text-slate-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[15px] peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-medium peer-placeholder-shown:capitalize peer-placeholder-shown:text-slate-400 peer-focus:top-0 peer-focus:text-[10px] peer-focus:tracking-widest peer-focus:text-elm peer-focus:uppercase peer-focus:font-black transition-all duration-300 pointer-events-none"
    >
      {label}
    </label>
  </div>
);

export default function KontakHero({ contactInfo, categories = [] }) {
  const containerRef = useRef(null);
  const t = useTranslations("kontakHero");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    service: "",
    message: "",
  });

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = `Halo Awan Kusuma Legalitas! 👋\n\nSaya ${form.name} ingin berkonsultasi.\n\n*Nomor HP:* ${form.phone}\n*Layanan yang diminati:* ${form.service || "Belum ditentukan"}\n\n*Pesan:*\n${form.message}`;
    window.open(`https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
  };

  useEffect(() => {
    if (!containerRef.current) return;
    // Konten hero harus langsung terlihat di mobile. Menyembunyikannya dengan
    // opacity: 0 setelah hydration membuat LCP bergantung pada JS/GSAP.
    // Entrance motion desktop dipertahankan, dengan transform saja.
    const canAnimateIntro = window.matchMedia(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    ).matches;

    if (!canAnimateIntro) return undefined;

    const ctx = gsap.context(() => {
       const tl = gsap.timeline();
       
       tl.fromTo(".contact-left-content > *", 
         { x: -30 },
         { x: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" },
       );

       tl.fromTo(".contact-form-card",
         { x: 50, scale: 0.95 },
         { x: 0, scale: 1, duration: 1, ease: "power4.out" },
         "-=0.6"
       );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative w-full overflow-hidden bg-white selection:bg-elm selection:text-white pb-10">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[70vh] bg-gradient-to-br from-slate-50 via-white to-transparent -z-10" />
      <div className="absolute top-40 right-[-10vw] w-[40vw] h-[40vw] bg-elm/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 w-full pt-32 pb-20 lg:pt-48">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          
          {/* LEFT COLUMN: Content */}
          <div className="contact-left-content lg:col-span-6 flex flex-col items-start pt-4">
            
            <div className="inline-flex items-center gap-3 text-elm mb-8">
              <span className="w-2 h-2 bg-elm rotate-45 shrink-0" />
              <span className="text-[11px] font-black tracking-[0.2em] uppercase">{t("subheading")}</span>
            </div>

            <h1 className="text-4xl md:text-5xl xl:text-6xl font-black text-big-stone tracking-tight uppercase leading-[0.9] mb-8">
              {t("heading1")}
              <br />
              <span className="text-elm">{t("heading2")}</span>
              <br />
              {t("heading3")}
            </h1>

            <p className="text-lg text-slate-500 font-medium max-w-lg leading-relaxed mb-10">
              {t("description")}
            </p>

            {/* Trust Indicators */}
            <div className="flex flex-col gap-5 mb-12">
               {[1, 2, 3].map((num, i) => (
                 <div key={i} className="flex items-start gap-4 group">
                    <div className="w-6 h-6 rounded-lg bg-elm/10 flex items-center justify-center shrink-0 mt-1 group-hover:bg-elm group-hover:text-white transition-all duration-300">
                       <svg className="w-4 h-4 text-elm group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                       </svg>
                    </div>
                    <div>
                       <h4 className="text-slate-800 font-bold text-[15px] mb-0.5">{t(`trustSignals.${num}.text`)}</h4>
                       <p className="text-slate-400 text-[13px] font-medium">{t(`trustSignals.${num}.detail`)}</p>
                    </div>
                 </div>
               ))}
            </div>

          </div>

          {/* RIGHT COLUMN: Form Card */}
          <div className="lg:col-span-6 w-full lg:-mt-10">
            <div className="contact-form-card bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/80 border border-slate-100/50 relative group">
               {/* Aesthetic Top Bar */}
               <div className="absolute top-0 left-0 w-full h-1.5 bg-elm rounded-t-[2.5rem] opacity-10 group-hover:opacity-100 transition-opacity duration-500" />
               
               <div className="mb-10 text-center lg:text-left">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-2">{t("formTitle")}</h3>
                  <p className="text-slate-400 font-medium text-sm">{t("formDesc")}</p>
               </div>

               <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                  <InputField label={t("formLabels.name")} id="name" value={form.name} onChange={handleChange("name")} required />
                  <InputField label={t("formLabels.phone")} id="phone" type="tel" value={form.phone} onChange={handleChange("phone")} required />
                  
                  <CustomSelect 
                    label={t("formLabels.service")}
                    value={form.service}
                    onChange={(val) => setForm(prev => ({ ...prev, service: val }))}
                    options={[
                      ...(categories || []).map(cat => ({
                        value: cat.category,
                        label: cat.category
                      })),
                      { value: "Lainnya", label: t("formPlaceholders.serviceOther") }
                    ]}
                  />

                  <div className="relative w-full">
                    <textarea
                      id="message"
                      value={form.message}
                      onChange={handleChange("message")}
                      rows={3}
                      placeholder=" "
                      required
                      className="peer w-full border-b border-slate-200 pt-6 pb-2 text-[15px] text-slate-800 bg-transparent focus:outline-none focus:border-elm transition-colors duration-300 placeholder-transparent font-medium resize-none"
                    />
                    <label
                      htmlFor="message"
                      className="absolute top-0 left-0 text-[10px] tracking-widest uppercase font-black text-slate-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[15px] peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-medium peer-placeholder-shown:capitalize peer-placeholder-shown:text-slate-400 peer-focus:top-0 peer-focus:text-[10px] peer-focus:tracking-widest peer-focus:text-elm peer-focus:uppercase peer-focus:font-black transition-all duration-300 pointer-events-none"
                    >
                      {t("formLabels.message")}
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-5 rounded-2xl bg-elm text-white font-black text-[13px] tracking-widest uppercase hover:bg-big-stone transition-all duration-300 shadow-xl shadow-elm/20 hover:shadow-big-stone/30 hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="relative z-10">{t("formSubmit")}</span>
                  </button>
               </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
