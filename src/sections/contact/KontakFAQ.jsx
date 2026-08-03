"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { useTranslations } from "next-intl";

function FaqItem({ item, isOpen, onClick }) {
  const contentRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;
    if (isOpen) {
      gsap.to(contentRef.current, {
        height: "auto",
        opacity: 1,
        duration: 0.4,
        ease: "power3.out",
      });
      gsap.to(iconRef.current, { rotation: 45, duration: 0.3, ease: "power2.out" });
    } else {
      gsap.to(contentRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
      });
      gsap.to(iconRef.current, { rotation: 0, duration: 0.3, ease: "power2.out" });
    }
  }, [isOpen]);

  return (
    <div
      className={`border-b border-slate-100 transition-colors duration-300 ${isOpen ? "border-elm/20" : ""}`}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-6 py-7 text-left group focus:outline-none"
      >
        <span className={`text-[16px] md:text-[18px] font-bold leading-snug transition-colors duration-300 ${isOpen ? "text-elm" : "text-black group-hover:text-elm"}`}>
          {item.question}
        </span>
        <span
          ref={iconRef}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-colors duration-300 ${isOpen ? "border-elm text-elm" : "border-slate-200 text-slate-400 group-hover:border-elm group-hover:text-elm"}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>

      {/* Answer — starts hidden, GSAP controls height */}
      <div ref={contentRef} style={{ height: 0, overflow: "hidden", opacity: 0 }}>
        <p className="text-[15px] md:text-[16px] text-slate-500 leading-relaxed pb-7 max-w-3xl font-medium">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export default function KontakFAQ({ faqData }) {
  const t = useTranslations("kontakFaq");
  const [openId, setOpenId] = useState(faqData[0]?.id ?? null);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.fromTo(
      sectionRef.current.querySelectorAll(".faq-item"),
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" }
      }
    );
  }, []);

  return (
    <section id="faq" ref={sectionRef} className="w-full bg-white py-24 px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">

        {/* Left: Heading */}
        <div className="lg:col-span-4">
          <div className="inline-flex items-center gap-3 text-elm mb-8">
            <span className="w-2 h-2 bg-elm rotate-45 shrink-0" />
            <span className="text-[11px] font-black tracking-[0.2em] uppercase">{t("subheading")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-big-stone tracking-tight uppercase leading-tight mb-6">
            {t("heading1")} <br /><span className="text-elm">{t("heading2")}</span>
          </h2>
          <p className="text-slate-500 leading-relaxed text-base">
            {t("description")}
          </p>
        </div>

        {/* Right: Accordion */}
        <div className="lg:col-span-8 border-t border-slate-100">
          {faqData.map((item) => (
            <div key={item.id} className="faq-item opacity-100">
              <FaqItem
                item={item}
                isOpen={openId === item.id}
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
