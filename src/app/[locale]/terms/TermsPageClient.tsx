'use client';

import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { type Locale } from '@/lib/i18n/config';

interface TermsPageClientProps {
  locale: Locale;
}

interface Para {
  heading: string;
  body: string[];
  links?: { href: string; label: string; external?: boolean }[];
}

const IT: { title: string; intro: string; lastUpdated: string; sections: Para[] } = {
  title: 'Termini di Servizio',
  intro: 'MadPDF è il servizio di strumenti PDF di madweb.it. Usando pdf.madweb.it accetti i termini descritti in questa pagina.',
  lastUpdated: 'Ultimo aggiornamento: settembre 2026',
  sections: [
    {
      heading: '1. Oggetto del servizio',
      body: [
        'MadPDF offre strumenti online per elaborare documenti PDF: unire, dividere, comprimere, convertire, modificare e proteggere i file. L’elaborazione avviene nel browser del dispositivo dell’utente; il servizio include uno spazio cloud personale da 100 MB per salvare file e risultati.',
      ],
    },
    {
      heading: '2. Account',
      body: [
        'Per usare MadPDF è necessario un account madweb.it. La registrazione, la gestione della password e le regole dell’account sono disciplinate da madweb.it; accedendo a pdf.madweb.it con il tuo account accetti anche i termini di madweb.it che lo regolano.',
      ],
      links: [
        { href: 'https://madweb.it/registrazione/', label: 'Registrazione madweb.it', external: true },
        { href: 'https://madweb.it/contatti/', label: 'Supporto madweb.it', external: true },
      ],
    },
    {
      heading: '3. Spazio cloud',
      body: [
        'Ogni account dispone di 100 MB di spazio cloud gratuito. Lo spazio serve per conservare i tuoi documenti e i risultati degli strumenti; l’uso deve essere personale e lecito. Puoi eliminare file e cartelle in qualsiasi momento: l’eliminazione è definitiva.',
        'Ci riserviamo il diritto di limitare gli usi che compromettano il funzionamento o la sicurezza del servizio. Superata la quota, i nuovi salvataggi vengono rifiutati finché non liberi spazio.',
      ],
    },
    {
      heading: '4. Uso consentito',
      body: [
        'Non puoi usare MadPDF per attività illecite, per elaborare contenuti che violino i diritti altrui o per tentare di accedere a file o account di altri utenti. I file di altri utenti sono privati e protetti.',
      ],
    },
    {
      heading: '5. Software open source',
      body: [
        'Il codice di MadPDF è pubblicato con licenza AGPL-3.0: chiunque può consultarlo, verificarlo e contribuire. Il link al codice sorgente è disponibile nel piè di pagina del sito.',
      ],
      links: [
        { href: 'https://github.com/mazgalesc/it_purecraft', label: 'Codice sorgente (AGPL-3.0)', external: true },
      ],
    },
    {
      heading: '6. Disponibilità e responsabilità',
      body: [
        'Offriamo il servizio con la massima diligenza possibile, ma non garantiamo la disponibilità ininterrotta né l’assenza di errori. Raccomandiamo di conservare copie dei documenti importanti. La nostra responsabilità è limitata nei limiti consentiti dalla legge; l’elaborazione dei PDF avviene localmente e non possiamo rispondere del contenuto dei tuoi file.',
      ],
    },
    {
      heading: '7. Modifiche ai termini',
      body: [
        'Possiamo aggiornare questi termini: la versione corrente è sempre visibile su questa pagina. L’uso continuato del servizio dopo la pubblicazione delle modifiche costituisce accettazione.',
      ],
    },
    {
      heading: '8. Contatti',
      body: ['Per domande su questi termini o sul servizio, contattaci tramite madweb.it.'],
      links: [{ href: 'https://madweb.it/contatti/', label: 'Contatta madweb.it', external: true }],
    },
  ],
};

const EN: typeof IT = {
  title: 'Terms of Service',
  intro: 'MadPDF is the PDF tool service of madweb.it. By using pdf.madweb.it you accept the terms described on this page.',
  lastUpdated: 'Last updated: September 2026',
  sections: [
    {
      heading: '1. Purpose of the service',
      body: [
        'MadPDF provides online tools to work with PDF documents: merge, split, compress, convert, edit and protect files. Processing happens in the user\u2019s browser; the service includes a personal 100 MB cloud space to keep files and results.',
      ],
    },
    {
      heading: '2. Account',
      body: [
        'Using MadPDF requires a madweb.it account. Registration, password management and account rules are governed by madweb.it; by signing in to pdf.madweb.it you also accept madweb.it\u2019s terms governing the account.',
      ],
      links: [
        { href: 'https://madweb.it/registrazione/', label: 'madweb.it registration', external: true },
        { href: 'https://madweb.it/contatti/', label: 'madweb.it support', external: true },
      ],
    },
    {
      heading: '3. Cloud space',
      body: [
        'Every account gets 100 MB of free cloud space. The space is meant for your personal documents and tool results, and must only be used lawfully. You can delete files and folders at any time: deletion is permanent.',
        'We reserve the right to restrict uses that endanger the operation or security of the service. When the quota is exceeded, new saves are rejected until you free up space.',
      ],
    },
    {
      heading: '4. Acceptable use',
      body: [
        'You may not use MadPDF for unlawful activity, to process content that infringes other people\u2019s rights, or to attempt to access other users\u2019 files or accounts. Other users\u2019 files are private and protected.',
      ],
    },
    {
      heading: '5. Open source software',
      body: [
        'MadPDF\u2019s code is published under the AGPL-3.0 license: anyone can read, audit and contribute to it. The source link is available in the site footer.',
      ],
      links: [{ href: 'https://github.com/mazgalesc/it_purecraft', label: 'Source code (AGPL-3.0)', external: true }],
    },
    {
      heading: '6. Availability and liability',
      body: [
        'We run the service with the greatest possible care, but we do not guarantee uninterrupted availability or absence of errors. We recommend keeping copies of important documents. Our liability is limited to the extent permitted by law; PDF processing happens locally and we cannot be responsible for the content of your files.',
      ],
    },
    {
      heading: '7. Changes to these terms',
      body: [
        'We may update these terms: the current version is always shown on this page. Continued use of the service after changes are published constitutes acceptance.',
      ],
    },
    {
      heading: '8. Contact',
      body: ['Questions about these terms or the service can be sent through madweb.it.'],
      links: [{ href: 'https://madweb.it/contatti/', label: 'Contact madweb.it', external: true }],
    },
  ],
};

export default function TermsPageClient({ locale }: TermsPageClientProps) {
  const t = useTranslations();
  const copy = locale === 'it' ? IT : EN;

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-[hsl(var(--color-primary)/0.1)] via-[hsl(var(--color-background))] to-[hsl(var(--color-secondary)/0.1)] py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--color-primary)/0.12)] mb-6">
                <FileText className="h-8 w-8 text-[hsl(var(--color-primary))]" />
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
                  {section.body.map((para, i) => (
                    <p key={i} className="text-[hsl(var(--color-muted-foreground))] mb-4">
                      {para}
                    </p>
                  ))}
                  {section.links && (
                    <div className="flex flex-wrap gap-4 mb-4">
                      {section.links.map((link, i) => (
                        <a
                          key={i}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[hsl(var(--color-primary))] hover:underline"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-sm text-[hsl(var(--color-muted-foreground))] mt-8">
                {t('common.brand')} — {copy.title}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}