'use client';

import { Cookie, Shield, Settings } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { type Locale } from '@/lib/i18n/config';

interface CookiesPageClientProps {
  locale: Locale;
}

interface Section {
  heading: string;
  body?: string[];
  list?: string[];
  table?: { name: string; description: string }[];
}

const IT: { title: string; intro: string; lastUpdated: string; sections: Section[] } = {
  title: 'Cookie Policy',
  intro:
    'MadPDF usa solo cookie funzionali, necessari al servizio: niente pubblicità, niente tracciamento di terze parti.',
  lastUpdated: 'Ultimo aggiornamento: settembre 2026',
  sections: [
    {
      heading: 'Cosa sono i cookie',
      body: [
        'I cookie sono piccoli file che il sito salva nel tuo browser. Alcuni sono necessari perché il servizio funzioni (per esempio per riconoscerti quando sei autenticato), altri ricordano le tue preferenze.',
      ],
    },
    {
      heading: 'Cookie che utilizziamo',
      table: [
        {
          name: 'Cookie di sessione madweb.it (wordpress_*)',
          description:
            'Necessari. Mantengono l’accesso con il tuo account madweb.it su pdf.madweb.it e su madweb.it. Scadono con la sessione (o secondo la scelta “ricordami” al login).',
        },
        {
          name: 'Preferenza lingua',
          description:
            'Ricorda la lingua (italiano o inglese) che hai scelto, così non devi selezionarla a ogni visita.',
        },
        {
          name: 'Preferenza tema',
          description: 'Ricorda se preferisci il tema chiaro o scuro.',
        },
      ],
    },
    {
      heading: 'Cookie che NON utilizziamo',
      list: [
        'Cookie pubblicitari o di retargeting',
        'Cookie analitici di terze parti (Google Analytics o simili)',
        'Pixel dei social network',
      ],
    },
    {
      heading: 'Come gestirli',
      body: [
        'I cookie di sessione sono indispensabili per usare gli strumenti con il tuo account: bloccarli equivale a non poter accedere. Le preferenze (lingua, tema) puoi cancellarle in qualsiasi momento svuotando i dati del sito dal browser.',
        'Per la politica cookie del tuo account madweb.it, fai riferimento a madweb.it.',
      ],
    },
  ],
};

const EN: typeof IT = {
  title: 'Cookie Policy',
  intro:
    'MadPDF uses only functional cookies required by the service: no advertising, no third-party tracking.',
  lastUpdated: 'Last updated: September 2026',
  sections: [
    {
      heading: 'What cookies are',
      body: [
        'Cookies are small files a website stores in your browser. Some are necessary for the service to work (for example to recognise you while signed in), others remember your preferences.',
      ],
    },
    {
      heading: 'Cookies we use',
      table: [
        {
          name: 'madweb.it session cookies (wordpress_*)',
          description:
            'Essential. They keep you signed in with your madweb.it account on pdf.madweb.it and madweb.it. They expire with the session (or according to the “remember me” choice at login).',
        },
        {
          name: 'Language preference',
          description: 'Remembers the language (Italian or English) you picked, so you do not have to choose again on every visit.',
        },
        {
          name: 'Theme preference',
          description: 'Remembers whether you prefer the light or dark theme.',
        },
      ],
    },
    {
      heading: 'Cookies we do NOT use',
      list: [
        'Advertising or retargeting cookies',
        'Third-party analytics cookies (Google Analytics or similar)',
        'Social network pixels',
      ],
    },
    {
      heading: 'Managing them',
      body: [
        'Session cookies are required to use the tools with your account: blocking them means you cannot sign in. You can clear preferences (language, theme) at any time by wiping the site data in your browser.',
        'For the cookie policy of your madweb.it account, refer to madweb.it.',
      ],
    },
  ],
};

export default function CookiesPageClient({ locale }: CookiesPageClientProps) {
  const copy = locale === 'it' ? IT : EN;

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-[hsl(var(--color-primary)/0.1)] via-[hsl(var(--color-background))] to-[hsl(var(--color-secondary)/0.1)] py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--color-primary)/0.12)] mb-6">
                <Cookie className="h-8 w-8 text-[hsl(var(--color-primary))]" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--color-foreground))] mb-6">{copy.title}</h1>
              <p className="text-lg text-[hsl(var(--color-muted-foreground))]">{copy.intro}</p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto prose prose-lg">
              <p className="text-sm text-[hsl(var(--color-muted-foreground))] mb-8">{copy.lastUpdated}</p>
              {copy.sections.map((section, index) => (
                <div key={index}>
                  <h2 className="text-2xl font-bold text-[hsl(var(--color-foreground))] mt-8 mb-4">{section.heading}</h2>
                  {section.body?.map((para, i) => (
                    <p key={i} className="text-[hsl(var(--color-muted-foreground))] mb-4">
                      {para}
                    </p>
                  ))}
                  {section.table && (
                    <ul className="mb-4 space-y-3">
                      {section.table.map((row, i) => (
                        <li key={i} className="rounded-xl border border-[hsl(var(--color-border))] p-4">
                          <span className="block text-sm font-semibold text-[hsl(var(--color-foreground))]">{row.name}</span>
                          <span className="mt-1 block text-sm text-[hsl(var(--color-muted-foreground))]">
                            {row.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.list && (
                    <ul className="list-disc pl-6 space-y-2 text-[hsl(var(--color-muted-foreground))] mb-4">
                      {section.list.map((li, i) => (
                        <li key={i}>{li}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <div className="mt-10 flex flex-wrap items-center gap-4 rounded-xl bg-[hsl(var(--color-muted)/0.4)] p-4 text-sm text-[hsl(var(--color-muted-foreground))]">
                <Shield className="h-5 w-5 shrink-0 text-[hsl(var(--color-success))]" aria-hidden />
                <span className="flex-1">{copy.intro}</span>
                <Settings className="h-5 w-5 shrink-0 opacity-50" aria-hidden />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
