'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n/config';

// Root page handles client-side redirection based on browser language
export default function RootPage() {
  const router = useRouter();

  // madweb fork: Italian-first — every visitor lands on /it (the product default); the
  // language menu inside the app remains available for other locales.
  useEffect(() => {
    router.replace(`/${defaultLocale}`);
  }, [router]);

  // Render nothing while redirecting
  return null;
}
