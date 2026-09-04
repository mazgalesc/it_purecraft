/**
 * Site configuration (madweb fork: MadPDF at pdf.madweb.it)
 */
export const siteConfig = {
  name: 'MadPDF',
  description: 'Strumenti PDF gratuiti per gli utenti madweb.it: elaborazione locale nel browser e spazio cloud personale da 100 MB.',
  url: 'https://pdf.madweb.it',
  ogImage: '/images/og-image.png',
  links: {
    website: 'https://madweb.it',
    source: 'https://github.com/mazgalesc/it_purecraft',
  },
  creator: 'madweb.it',
  keywords: [
    'PDF tools',
    'PDF editor',
    'merge PDF',
    'split PDF',
    'compress PDF',
    'convert PDF',
    'free PDF tools',
    'madweb.it',
    'PDF online',
    'browser-based PDF',
    'local PDF processing',
  ],
  // SEO-related settings
  seo: {
    titleTemplate: '%s | MadPDF',
    defaultTitle: 'MadPDF - Strumenti PDF professionali',
    locale: 'it_IT',
  },
};

/**
 * Navigation configuration
 */
export const navConfig = {
  mainNav: [
    { title: 'Home', href: '/' },
    { title: 'Tools', href: '/tools' },
    { title: 'About', href: '/about' },
    { title: 'FAQ', href: '/faq' },
  ],
  footerNav: [
    { title: 'Privacy', href: '/privacy' },
    { title: 'Contact', href: '/contact' },
  ],
};
