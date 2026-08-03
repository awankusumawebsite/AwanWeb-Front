import { NextIntlClientProvider } from 'next-intl';

import AboutCulture from './AboutCulture';
import AboutIntro from './AboutIntro';
import AboutVisiMisi from './AboutVisiMisi';
import AboutWhyAwanKusuma from './AboutWhyAwanKusuma';

export default function AboutPageIsland({ locale, messages }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="w-full overflow-hidden bg-white font-sans">
        <AboutIntro />
        <AboutWhyAwanKusuma />
        <AboutVisiMisi />
        <AboutCulture />
      </div>
    </NextIntlClientProvider>
  );
}
