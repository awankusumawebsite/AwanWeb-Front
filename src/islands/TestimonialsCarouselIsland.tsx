import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { gsap } from '../lib/gsap';
import 'swiper/css';

interface TestimonialItem {
  id?: number;
  name: string;
  role?: string | null;
  avatar?: string | null;
  quote: string;
}

interface Props {
  testimonials: TestimonialItem[];
}

/**
 * Setiap carousel membutuhkan cukup slide nyata sebelum Swiper membuat clone
 * internalnya. Ini mencegah loop tersendat pada viewport lebar ketika CMS
 * baru memiliki sedikit testimoni.
 */
function loopSafeItems(testimonials: TestimonialItem[]) {
  const items = [...testimonials];
  while (items.length > 0 && items.length < 6) items.push(...testimonials);
  return items;
}

interface CarouselCursorProps {
  containerRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
}

function CarouselDragCursor({ containerRef, visible }: CarouselCursorProps) {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const cursor = cursorRef.current;
    if (!mounted || !container || !cursor) return undefined;

    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });

    const move = (event: MouseEvent) => {
      xTo(event.clientX);
      yTo(event.clientY);
    };
    const enter = (event: MouseEvent) => {
      gsap.set(cursor, { x: event.clientX, y: event.clientY });
    };

    container.addEventListener('mousemove', move, { passive: true });
    container.addEventListener('mouseenter', enter, { passive: true });

    return () => {
      container.removeEventListener('mousemove', move);
      container.removeEventListener('mouseenter', enter);
    };
  }, [containerRef, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div ref={cursorRef} className="pointer-events-none fixed left-0 top-0 z-[99999]" style={{ willChange: 'transform' }}>
      <div
        className={`flex h-[110px] w-[110px] origin-center transform-gpu items-center justify-center rounded-full bg-[#1c2d3c] text-[13px] font-black tracking-widest text-white transition-[transform,opacity] duration-300 ease-out ${
          visible ? 'scale-100 opacity-90' : 'scale-0 opacity-0'
        }`}
      >
        GESER
      </div>
    </div>,
    document.body,
  );
}

export default function TestimonialsCarouselIsland({ testimonials }: Props) {
  const items = loopSafeItems(testimonials);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovering, setHovering] = useState(false);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      data-testimonials-carousel
      className="relative z-20 w-full select-none overflow-hidden cursor-grab active:cursor-grabbing"
      aria-label="Testimoni pelanggan. Geser ke kiri atau kanan untuk membaca testimoni lainnya."
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="hidden md:block">
        <CarouselDragCursor containerRef={containerRef} visible={hovering} />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[80] w-8 md:w-32"
        style={{ background: 'linear-gradient(to right, #dff0f5, transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[80] w-8 md:w-32"
        style={{ background: 'linear-gradient(to left, #e0edf5, transparent)' }}
      />

      <Swiper
        modules={[Autoplay]}
        spaceBetween={16}
        breakpoints={{
          768: { spaceBetween: 24 },
        }}
        slidesPerView="auto"
        centeredSlides
        loop
        grabCursor
        autoplay={{
          delay: 3500,
          disableOnInteraction: false,
        }}
        className="w-full !px-4 !py-8 md:!px-8 md:!py-12"
      >
        {items.map((item, index) => (
          <SwiperSlide
            // Duplicate slides need a deterministic unique key for Swiper's loop.
            key={`${item.id ?? item.name}-${index}`}
            className="!h-auto !min-h-[300px] !w-[260px] py-4 md:!min-h-[350px] md:!w-[330px]"
          >
            {({ isActive }) => (
              <article
                className={`group relative flex h-full shrink-0 flex-col overflow-hidden rounded-4xl bg-white px-5 py-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-[transform,opacity,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] md:px-7 md:py-8 ${
                  isActive
                    ? 'z-50 scale-105 opacity-100 md:scale-[1.12]'
                    : 'z-10 scale-[0.95] opacity-40 md:scale-[0.88]'
                }`}
              >
                <p className="relative z-10 flex-1 text-[13.5px] italic leading-[1.7] text-slate-600">“{item.quote}”</p>
                <div className="relative z-10 mb-5 mt-6 h-0.5 w-8 bg-elm/30 transition-[width] duration-500 group-hover:w-12" />
                <div className="relative z-10 flex items-center gap-3">
                  <img
                    src={item.avatar || '/images/mockups/photo-1560250097-0b93528c311a.webp'}
                    alt={item.name}
                    width={36}
                    height={36}
                    loading="lazy"
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                    {item.role && <p className="mt-0.5 text-[10px] text-slate-400">{item.role}</p>}
                  </div>
                </div>
              </article>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
