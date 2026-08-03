import { NextIntlClientProvider } from 'next-intl';

import KontakFAQ from './KontakFAQ';
import KontakHero from './KontakHero';
import KontakLocation from './KontakLocation';

export default function ContactPageIsland({ locale, messages, contactInfo, categories, faqData }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main className="min-h-screen w-full overflow-hidden bg-white font-sans text-black selection:bg-elm selection:text-white">
        <KontakHero contactInfo={contactInfo} categories={categories} />
        <KontakLocation contactInfo={contactInfo} />
        <KontakFAQ faqData={faqData} />
      </main>
    </NextIntlClientProvider>
  );
}
