"use client";

import { useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";

const ContactCTA = ({ icon, label, href, primary = false }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`contact-cta group flex items-center justify-between w-full p-5 rounded-2xl transition-all duration-400 border ${
        primary 
          ? "bg-elm text-white border-elm hover:bg-elm-accent hover:shadow-xl hover:shadow-elm/20" 
          : "bg-elm/5 text-elm border-elm/10 hover:bg-elm/10 hover:border-elm/30"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
          primary ? "bg-white/20" : "bg-elm/10"
        }`}>
          {icon}
        </div>
        <span className="text-[10px] sm:text-sm font-black tracking-widest uppercase truncate">{label}</span>
      </div>
      <svg className="hidden sm:block w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </a>
  );
};

const StaticInfoCard = ({ icon, label, value }) => {
  return (
    <div className="static-card flex items-start gap-5 p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
      <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-400 mb-1.5">{label}</p>
        <p className="text-[14px] font-bold text-slate-600 leading-snug wrap-break-word">{value}</p>
      </div>
    </div>
  );
};

export default function KontakLocation({ contactInfo }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Heading reveal
      gsap.fromTo(
        ".location-heading > *",
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out",
          scrollTrigger: { trigger: ".location-heading", start: "top 85%" }
        }
      );

      // CTAs reveal
      gsap.fromTo(
        ".contact-cta",
        { opacity: 0, x: -20 },
        {
          opacity: 1, x: 0, duration: 0.6, stagger: 0.15, ease: "power3.out",
          scrollTrigger: { trigger: ".cta-grid", start: "top 85%" }
        }
      );

      // Cards stagger
      gsap.fromTo(
        ".static-card",
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: ".info-grid", start: "top 85%" }
        }
      );

      // Map reveal
      gsap.fromTo(
        ".map-container",
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: ".map-container", start: "top 85%" }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const whatsappUrl = `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent("Halo Awan Kusuma, saya ingin berkonsultasi mengenai layanan legalitas.")}`;

  return (
    <section ref={sectionRef} className="w-full bg-white py-24 px-6 md:px-12 font-sans" id="lokasi">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-12 xl:col-span-5">
            <div className="location-heading mb-10">
              <div className="inline-flex items-center gap-3 text-elm mb-8">
                <span className="w-2 h-2 bg-elm rotate-45 shrink-0" />
                <span className="text-[11px] font-black tracking-[0.2em] uppercase">Hubungi Kami</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-big-stone tracking-tight uppercase leading-[1.1] mb-6">
                Alamat <span className="text-elm">&</span> Kontak
              </h2>
            </div>

            <div className="cta-grid grid grid-cols-2 lg:grid-cols-1 gap-4">
              <ContactCTA
                primary
                href={whatsappUrl}
                label="WhatsApp"
                icon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                }
              />
              <ContactCTA
                href={`mailto:${contactInfo.email}`}
                label="Email"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Right Column: Info Cards & Map */}
          <div className="lg:col-span-12 xl:col-span-7">
            <div className="info-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <StaticInfoCard
                label="Kantor Pusat"
                value={contactInfo.address}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
              <StaticInfoCard
                label="Jam Operasional"
                value={contactInfo.hours}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* Google Maps Embed */}
            <div className="map-container relative rounded-2xl overflow-hidden border border-slate-100 shadow-xl group">
              <iframe
                src={contactInfo.maps_embed}
                width="100%"
                height="340"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Awan Kusuma Legalitas"
                className="w-full lg:grayscale lg:group-hover:grayscale-0 transition-all duration-700"
              />
              {/* Maps Action Link Overlay */}
              <a 
                href={contactInfo.maps_url}
                target="_blank"
                className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black tracking-widest text-slate-800 uppercase shadow-lg border border-slate-100 hover:bg-elm hover:text-white transition-all duration-300"
              >
                Buka di Maps →
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
