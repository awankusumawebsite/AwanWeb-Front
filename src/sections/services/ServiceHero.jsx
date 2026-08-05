import { ArrowDownRight } from "lucide-react";

const defaultCopy = {
  prefix: "Jasa",
  suffix: "lebih Mudah bersama Kami",
  fallbackName: "Layanan Kami",
  fallbackDescription: "Layanan komprehensif dengan proses yang transparan, aman, dan efisien untuk mendukung legalitas bisnis Anda.",
  consultation: "Konsultasi Gratis",
  pricing: "Lihat Harga",
  whatsappTemplate: "Halo Awan Kusuma Legalitas! 👋 Saya tertarik dengan layanan {service}. Bisa konsultasi gratis?",
  fallbackService: "legalitas bisnis",
};

export default function ServiceHero({ name, description, whatsappNumber = "6285159358044", copy = defaultCopy }) {
  const labels = { ...defaultCopy, ...copy };
  const whatsappMessage = labels.whatsappTemplate.replace("{service}", name || labels.fallbackService);
  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  return (
    <section className="relative pt-32 pb-10 px-6 lg:px-12 w-full flex flex-col items-center justify-center text-center overflow-hidden">

      {/* Top Text Content */}
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center mt-6">
        
        {/* Massive Centered Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-[76px] font-black text-big-stone tracking-tight leading-[1.08] mb-6">
          {labels.prefix} <span className="text-elm">{name || labels.fallbackName}</span>{" "}
          <br className="hidden md:block"/>
          {labels.suffix}
        </h1>
        
        {/* Description */}
        <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-2xl mb-10">
          {description || labels.fallbackDescription}
        </p>
        
        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-big-stone text-white font-extrabold text-[12px] tracking-widest uppercase hover:bg-elm hover:-translate-y-1 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {labels.consultation}
          </a>
          <a href="#pricing-section" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 font-extrabold text-[12px] tracking-widest uppercase hover:border-elm hover:text-elm transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2">
            {labels.pricing} <ArrowDownRight size={16} strokeWidth={2.5} />
          </a>
        </div>
      </div>



    </section>
  );
}
