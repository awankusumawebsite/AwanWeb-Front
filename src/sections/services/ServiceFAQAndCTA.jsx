"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { Plus } from "lucide-react";
import { fallbackContactInfo } from "@/data/contact";

const defaultCopy = {
  kicker: "Mulai Konsultasi",
  contact: "Hubungi Kami",
  serviceQuestionTemplate: "Punya pertanyaan lebih spesifik mengenai layanan {service}?",
  generalPrompt: "Ceritakan kebutuhan bisnis Anda kepada kami.",
  fullName: "Nama Lengkap",
  whatsappNumber: "Nomor WhatsApp",
  message: "Pesan / Pertanyaan",
  send: "Kirim Pesan",
  titleLine1: "Pertanyaan",
  titleLine2: "Umum",
  descriptionTemplate: "Temukan jawaban cepat untuk keraguan Anda seputar {service}.",
  fallbackService: "layanan kami",
  whatsappGreeting: "Halo Awan Kusuma Legalitas! 👋",
  whatsappIntro: "Saya {name} ingin berkonsultasi{servicePart}.",
  whatsappServiceTemplate: " mengenai layanan {service}",
  whatsappPhone: "Nomor HP",
  whatsappMessage: "Pesan",
};

/**
 * @param {{
 *   faqs?: Array<{ question: string; answer: string }>;
 *   serviceName?: string;
 *   contactInfo?: typeof fallbackContactInfo;
 *   copy?: Record<string, any>;
 * }} props
 */
export default function ServiceFAQAndCTA({ faqs = [], serviceName = "", contactInfo: contactInfoProp, copy = defaultCopy }) {
  const labels = { ...defaultCopy, ...copy };
  const contactInfo = contactInfoProp || fallbackContactInfo;
  const containerRef = useRef(null);
  const [openIndex, setOpenIndex] = useState(null);
  
  // CTA Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    message: "",
  });

  const toggleFaq = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const servicePart = serviceName
      ? labels.whatsappServiceTemplate.replace("{service}", serviceName)
      : "";
    const intro = labels.whatsappIntro
      .replace("{name}", form.name)
      .replace("{servicePart}", servicePart);
    const text = `${labels.whatsappGreeting}\n\n${intro}\n\n*${labels.whatsappPhone}:* ${form.phone}\n\n*${labels.whatsappMessage}:*\n${form.message}`;
    window.open(
      `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Form Animation
      gsap.fromTo(
        ".cta-form-col",
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          },
        }
      );

      // FAQ Header Animation
      gsap.fromTo(
        ".faq-header > *",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".faq-col",
            start: "top 80%",
          },
        }
      );

      // FAQ Items Animation
      if (faqs && faqs.length > 0) {
        gsap.fromTo(
          ".faq-item",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".faq-list",
              start: "top 85%",
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [faqs]);

  const hasFaqs = faqs && faqs.length > 0;

  return (
    <section ref={containerRef} className="relative w-full overflow-hidden bg-slate-50/50 border-t border-slate-100 py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 items-start">
          
          {/* LEFT COLUMN: FORM KONSULTASI */}
          <div className="cta-form-col lg:col-span-5 w-full order-2 lg:order-1">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/80 border border-slate-100/50 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-elm opacity-10 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 text-elm mb-4">
                  <span className="w-1.5 h-1.5 bg-elm rotate-45 shrink-0" />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">{labels.kicker}</span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">
                  {labels.contact}
                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  {serviceName
                    ? labels.serviceQuestionTemplate.replace("{service}", serviceName)
                    : labels.generalPrompt}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="relative w-full">
                  <input
                    type="text"
                    id="faq-name"
                    value={form.name}
                    onChange={handleChange("name")}
                    required
                    placeholder=" "
                    className="peer w-full border-b border-slate-200 pt-5 pb-2 text-[14px] text-slate-800 bg-transparent focus:outline-none focus:border-elm transition-colors duration-300 placeholder-transparent font-medium"
                  />
                  <label
                    htmlFor="faq-name"
                    className="absolute top-0 left-0 text-[10px] tracking-widest uppercase font-black text-slate-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-medium peer-placeholder-shown:capitalize peer-placeholder-shown:text-slate-400 peer-focus:top-0 peer-focus:text-[10px] peer-focus:tracking-widest peer-focus:text-elm peer-focus:uppercase peer-focus:font-black transition-all duration-300 pointer-events-none"
                  >
                    {labels.fullName}
                  </label>
                </div>

                <div className="relative w-full">
                  <input
                    type="tel"
                    id="faq-phone"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    required
                    placeholder=" "
                    className="peer w-full border-b border-slate-200 pt-5 pb-2 text-[14px] text-slate-800 bg-transparent focus:outline-none focus:border-elm transition-colors duration-300 placeholder-transparent font-medium"
                  />
                  <label
                    htmlFor="faq-phone"
                    className="absolute top-0 left-0 text-[10px] tracking-widest uppercase font-black text-slate-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-medium peer-placeholder-shown:capitalize peer-placeholder-shown:text-slate-400 peer-focus:top-0 peer-focus:text-[10px] peer-focus:tracking-widest peer-focus:text-elm peer-focus:uppercase peer-focus:font-black transition-all duration-300 pointer-events-none"
                  >
                    {labels.whatsappNumber}
                  </label>
                </div>

                <div className="relative w-full">
                  <textarea
                    id="faq-message"
                    value={form.message}
                    onChange={handleChange("message")}
                    rows={3}
                    placeholder=" "
                    required
                    className="peer w-full border-b border-slate-200 pt-5 pb-2 text-[14px] text-slate-800 bg-transparent focus:outline-none focus:border-elm transition-colors duration-300 placeholder-transparent font-medium resize-none"
                  />
                  <label
                    htmlFor="faq-message"
                    className="absolute top-0 left-0 text-[10px] tracking-widest uppercase font-black text-slate-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-medium peer-placeholder-shown:capitalize peer-placeholder-shown:text-slate-400 peer-focus:top-0 peer-focus:text-[10px] peer-focus:tracking-widest peer-focus:text-elm peer-focus:uppercase peer-focus:font-black transition-all duration-300 pointer-events-none"
                  >
                    {labels.message}
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-4 rounded-xl bg-elm text-white font-black text-[12px] tracking-widest uppercase hover:bg-big-stone transition-all duration-300 shadow-xl shadow-elm/20 hover:shadow-big-stone/30 hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  <span className="relative z-10">{labels.send}</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: FAQ ACCORDION */}
          {hasFaqs && (
            <div className="faq-col lg:col-span-7 w-full order-1 lg:order-2 flex flex-col">
              <div className="faq-header mb-10">
                <h2 className="text-3xl md:text-5xl font-black text-big-stone tracking-tight uppercase mb-4">
                  {labels.titleLine1} <br className="hidden lg:block"/> {labels.titleLine2}
                </h2>
                <p className="text-slate-500 text-base md:text-lg leading-relaxed max-w-lg">
                  {labels.descriptionTemplate.replace("{service}", serviceName || labels.fallbackService)}
                </p>
              </div>

              <div className="faq-list flex flex-col">
                {faqs.map((faq, idx) => {
                  const isOpen = openIndex === idx;
                  return (
                    <div key={idx} className="faq-item border-b border-slate-200/80">
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="group flex items-start justify-between w-full py-5 lg:py-6 text-left focus:outline-none gap-4"
                        aria-expanded={isOpen}
                      >
                        <span className={`text-base lg:text-lg font-bold tracking-tight transition-colors duration-300 pr-4 ${
                          isOpen ? "text-elm" : "text-big-stone group-hover:text-elm"
                        }`}>
                          {faq.question}
                        </span>
                        <div className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-400 ${
                          isOpen ? "bg-elm border-elm" : "border-slate-200 group-hover:border-elm group-hover:bg-elm"
                        }`}>
                          <Plus strokeWidth={2} className={`w-4 h-4 transition-transform duration-300 ${
                            isOpen ? "rotate-135 text-white" : "rotate-0 text-slate-500 group-hover:text-white group-hover:rotate-90"
                          }`} />
                        </div>
                      </button>

                      <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}>
                        <div className="overflow-hidden">
                          <p className="pb-6 text-sm lg:text-base text-slate-500 leading-relaxed font-medium pr-8">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
