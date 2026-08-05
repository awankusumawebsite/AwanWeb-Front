import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../config/site';

type LocaleLink = {
  code: Locale;
  label: string;
  flag: string;
  name: string;
  href: string;
  active: boolean;
};

type Props = {
  links: LocaleLink[];
  variant?: 'desktop' | 'mobile';
};

export default function LanguageSwitcherIsland({ links, variant = 'desktop' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = links.find((link) => link.active) ?? links[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  if (variant === 'mobile') {
    return (
      <div className="menu-item mt-6 flex items-center gap-2">
        {links.map((link) => (
          <a
            key={link.code}
            href={link.href}
            lang={link.code}
            hrefLang={link.code}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold tracking-widest transition-all duration-300 ${
              link.active
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <span className="text-sm">{link.flag}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold tracking-wider text-black transition-colors duration-300 hover:bg-black/5 focus:outline-none"
        aria-label="Switch language"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="text-sm">{current.flag}</span>
        <span>{current.label}</span>
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[160px] origin-top-right animate-[language-menu-in_180ms_ease-out] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]"
          role="menu"
        >
          {links.map((link) => (
            <a
              key={link.code}
              href={link.href}
              lang={link.code}
              hrefLang={link.code}
              role="menuitem"
              aria-current={link.active ? 'true' : undefined}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-semibold transition-colors duration-200 ${
                link.active ? 'bg-elm/10 text-elm' : 'text-slate-700 hover:bg-gray-50 hover:text-elm'
              }`}
            >
              <span className="text-base">{link.flag}</span>
              <span>{link.name}</span>
              {link.active && (
                <svg
                  className="ml-auto h-3.5 w-3.5 text-elm"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
