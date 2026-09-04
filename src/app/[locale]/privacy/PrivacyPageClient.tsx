'use client';

import Link from 'next/link';
import { Shield, Lock, Server, Cloud, Eye } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import {type Locale, localePath } from '@/lib/i18n/config';

interface PrivacyPageClientProps {
  locale: Locale;
}

interface Section {
  heading: string;
  body?: string[];
  list?: string[];
  links?: { href: string; label: string; external?: boolean }[];
}

const IT: { lastUpdated: string; title: string; intro: string; highlights: { icon: string; title: string; description: string }[]; sections: Section[]; badgeTitle: string; badgeText: string } = {
  lastUpdated: 'Ultimo aggiornamento: settembre 2026',
  title: 'Informativa sulla Privacy',
  intro:
    'La tua privacy viene prima di tutto. MadPDF è progettato per elaborare i documenti nel tuo browser: i file vengono caricati sui nostri server solo se li salvi esplicitamente nel tuo spazio cloud.',
  highlights: [
    {
      icon: 'server',
      title: 'Elaborazione locale',
      description: 'Gli strumenti girano nel tuo browser con JavaScript e WebAssembly: nessun documento viene caricato mentre lavori.',
    },
    {
      icon: 'cloud',
      title: 'Spazio cloud privato',
      description: 'I file che salvi nel tuo spazio MadPDF sono accessibili solo con il tuo account madweb.it.',
    },
    {
      icon: 'lock',
      title: 'Account madweb.it',
      description: 'L’accesso usa gli stessi account di madweb.it: nessuna password duplicata, una sola sessione per tutti i servizi.',
    },
    {
      icon: 'eye',
      title: 'Nessuna pubblicità',
      description: 'Non vendiamo dati e non usiamo tracker pubblicitari. Solo cookie funzionali al servizio.',
    },
  ],
  sections: [
    {
      heading: '1. Introduzione',
      body: [
        'MadPDF è un servizio di strumenti PDF offerto da madweb.it (di seguito “noi”). Questa informativa spiega come trattiamo i tuoi dati quando usi i nostri strumenti su pdf.madweb.it.',
        'I tuoi documenti non vengono mai caricati sui nostri server mentre usi uno strumento: tutta l’elaborazione avviene localmente nel tuo browser. I file arrivano sui nostri server solo quando li salvi tu, volontariamente, nel tuo spazio cloud.',
      ],
    },
    {
      heading: '2. Come funziona il servizio',
      list: [
        'Ogni strumento elabora i PDF direttamente nel tuo browser (JavaScript e WebAssembly): durante l’elaborazione nessun file lascia il tuo dispositivo.',
        'Lo spazio cloud (100 MB inclusi, per utente) ti permette di salvare file e risultati per riaprili in seguito: questi file sono archiviati sui nostri server e protetti dal tuo account.',
        'Il login usa gli account madweb.it esistenti: non creiamo database di utenti separati e non memorizziamo password.',
      ],
    },
    {
      heading: '3. File e spazio cloud',
      body: [
        'Per ogni file salvato nello spazio cloud memorizziamo il contenuto e alcuni metadati (nome originale, dimensione, data di caricamento). Il file è visibile e scaricabile solo dall’account che lo ha salvato: nessun altro utente può accedervi.',
        'Puoi eliminare un file o un’intera cartella in qualsiasi momento dalla pagina “I miei file”: l’eliminazione è definitiva e libera immediatamente lo spazio. Lo spazio cloud non viene usato per finalità pubblicitarie né profilazione.',
      ],
    },
    {
      heading: '4. Dati dell’account madweb.it',
      body: [
        'L’account (nome, e-mail e password) è gestito da madweb.it secondo la sua informativa e i suoi termini di servizio. MadPDF usa la sessione autenticata per riconoscerti: accedendo a pdf.madweb.it sei già autenticato se hai un account madweb.it attivo.',
      ],
      links: [
        { href: 'https://madweb.it/registrazione/', label: 'Registrazione madweb.it', external: true },
        { href: 'https://madweb.it/contatti/', label: 'Contatti madweb.it', external: true },
      ],
    },
    {
      heading: '5. Cookie e dati locali',
      body: [
        'Usiamo esclusivamente cookie funzionali: il cookie di sessione del tuo account madweb.it (necessario per accedere) e preferenze di lingua salvate nel browser. Non usiamo cookie pubblicitari né sistemi di tracciamento di terze parti.',
      ],
      links: [{ href: '/cookies', label: 'Dettagli sui cookie' }],
    },
    {
      heading: '6. Sicurezza e conservazione',
      list: [
        'Le comunicazioni con pdf.madweb.it sono protette con TLS.',
        'I file dello spazio cloud sono archiviati sui server madweb.it e l’accesso è autorizzato solo con la sessione del proprietario.',
        'I dati dello spazio cloud vengono conservati finché l’account è attivo; l’eliminazione dell’account su madweb.it comporta la cancellazione dello spazio associato.',
      ],
    },
    {
      heading: '7. I tuoi diritti (GDPR)',
      body: [
        'Hai il diritto di accedere ai file del tuo spazio, esportarli, eliminarli e di chiedere chiarimenti sul trattamento. Poiché l’account è gestito da madweb.it, per l’esercizio dei diritti relativi all’account puoi rivolgerti a madweb.it.',
      ],
      links: [{ href: 'https://madweb.it/contatti/', label: 'Contatta madweb.it', external: true }],
    },
    {
      heading: '8. Modifiche e contatti',
      body: [
        'Possiamo aggiornare questa informativa: la versione corrente è sempre disponibile su questa pagina, con la data di aggiornamento. Per domande su questa informativa o sullo spazio cloud, contattaci tramite madweb.it.',
      ],
      links: [{ href: 'https://madweb.it/contatti/', label: 'Supporto', external: true }],
    },
  ],
  badgeTitle: 'Elaborazione locale · spazio cloud privato',
  badgeText: 'I documenti vengono elaborati nel tuo browser; i file dello spazio cloud sono accessibili solo a te.',
};

const EN: typeof IT = {
  lastUpdated: 'Last updated: September 2026',
  title: 'Privacy Policy',
  intro:
    'Your privacy comes first. MadPDF is designed to process documents in your browser: files are uploaded to our servers only if you explicitly save them to your cloud space.',
  highlights: [
    {
      icon: 'server',
      title: 'Local processing',
      description: 'Tools run in your browser with JavaScript and WebAssembly — no document is uploaded while you work.',
    },
    {
      icon: 'cloud',
      title: 'Private cloud space',
      description: 'Files you save to your MadPDF space are accessible only with your madweb.it account.',
    },
    {
      icon: 'lock',
      title: 'madweb.it account',
      description: 'Sign-in uses your existing madweb.it accounts: no duplicated passwords, one session across services.',
    },
    {
      icon: 'eye',
      title: 'No advertising',
      description: 'We do not sell data and use no advertising trackers. Only functional cookies.',
    },
  ],
  sections: [
    {
      heading: '1. Introduction',
      body: [
        'MadPDF is a PDF tool service operated by madweb.it ("we"). This policy explains how we handle your data when you use our tools at pdf.madweb.it.',
        'Your documents are never uploaded to our servers while a tool runs: all processing happens locally in your browser. Files only reach our servers when you voluntarily save them to your cloud space.',
      ],
    },
    {
      heading: '2. How the service works',
      list: [
        'Every tool processes PDFs directly in your browser (JavaScript and WebAssembly): no file leaves your device during processing.',
        'The cloud space (100 MB included, per user) lets you save files and results for later: those files are stored on our servers and protected by your account.',
        'Sign-in uses existing madweb.it accounts: we keep no separate user database and store no passwords.',
      ],
    },
    {
      heading: '3. Files and cloud space',
      body: [
        'For every file saved to the cloud space we store its content and a few metadata fields (original name, size, upload date). The file is visible and downloadable only by the account that saved it — no other user can access it.',
        'You can delete a file or a whole folder at any time from the "My files" page: deletion is permanent and frees space immediately. The cloud space is not used for advertising or profiling.',
      ],
    },
    {
      heading: '4. Your madweb.it account data',
      body: [
        'The account (name, email and password) is managed by madweb.it under its own privacy policy and terms of service. MadPDF uses the authenticated session to recognise you: if you have an active madweb.it account you are already signed in when you open pdf.madweb.it.',
      ],
      links: [
        { href: 'https://madweb.it/registrazione/', label: 'madweb.it registration', external: true },
        { href: 'https://madweb.it/contatti/', label: 'madweb.it contact', external: true },
      ],
    },
    {
      heading: '5. Cookies and local data',
      body: [
        'We use only functional cookies: your madweb.it session cookie (required to sign in) and a language preference kept in the browser. We use no advertising cookies and no third-party tracking.',
      ],
      links: [{ href: '/cookies', label: 'Cookie details' }],
    },
    {
      heading: '6. Security and retention',
      list: [
        'Communications with pdf.madweb.it are protected with TLS.',
        'Cloud-space files are stored on madweb.it servers and access is authorised only through the owner\u2019s session.',
        'Cloud data is kept while your account is active; deleting your madweb.it account also removes the associated cloud space.',
      ],
    },
    {
      heading: '7. Your rights (GDPR)',
      body: [
        'You have the right to access, export and delete the files in your space, and to ask questions about the processing. Because the account itself is managed by madweb.it, account-related rights requests should be directed to madweb.it.',
      ],
      links: [{ href: 'https://madweb.it/contatti/', label: 'Contact madweb.it', external: true }],
    },
    {
      heading: '8. Changes and contact',
      body: [
        'We may update this policy: the current version is always available on this page with its update date. Questions about this policy or the cloud space can be sent through madweb.it.',
      ],
      links: [{ href: 'https://madweb.it/contatti/', label: 'Support', external: true }],
    },
  ],
  badgeTitle: 'Local processing · private cloud space',
  badgeText: 'Documents are processed in your browser; cloud-space files are accessible only to you.',
};

const ICONS: Record<string, typeof Server> = { server: Server, cloud: Cloud, lock: Lock, eye: Eye };

export default function PrivacyPageClient({ locale }: PrivacyPageClientProps) {
  const copy = locale === 'it' ? IT : EN;

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[hsl(var(--color-primary)/0.1)] via-[hsl(var(--color-background))] to-[hsl(var(--color-secondary)/0.1)] py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--color-foreground))] mb-6">{copy.title}</h1>
              <p className="text-lg text-[hsl(var(--color-muted-foreground))]">{copy.intro}</p>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="py-12 bg-[hsl(var(--color-muted)/0.3)]">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {copy.highlights.map((item, index) => {
                const Icon = ICONS[item.icon] || Server;
                return (
                  <Card key={index} className="p-6 text-center" hover>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                      <Icon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-[hsl(var(--color-foreground))] mb-2">{item.title}</h3>
                    <p className="text-sm text-[hsl(var(--color-muted-foreground))]">{item.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Policy content */}
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
                  {section.list && (
                    <ul className="list-disc pl-6 space-y-2 text-[hsl(var(--color-muted-foreground))] mb-4">
                      {section.list.map((li, i) => (
                        <li key={i}>{li}</li>
                      ))}
                    </ul>
                  )}
                  {section.links && (
                    <div className="flex flex-wrap gap-4 mb-4">
                      {section.links.map((link, i) =>
                        link.external ? (
                          <a
                            key={i}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[hsl(var(--color-primary))] hover:underline"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            key={i}
                            href={localePath(locale, `${link.href}`)}
                            className="text-sm font-medium text-[hsl(var(--color-primary))] hover:underline"
                          >
                            {link.label}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy badge */}
        <section className="py-12 bg-[hsl(var(--color-muted)/0.3)]">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-3 px-6 py-4 bg-green-50 border border-green-200 rounded-lg">
                <Shield className="h-8 w-8 text-green-600 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-green-800">{copy.badgeTitle}</p>
                  <p className="text-sm text-green-600">{copy.badgeText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
