import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { AuthProviderWrapper } from "@/components/AuthProviderWrapper";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://projecttruth.org';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: BASE_URL,
      siteName: 'Project Truth',
      images: [{ url: `${BASE_URL}/api/og`, width: 1200, height: 630, alt: 'Project Truth' }],
      type: 'website',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('ogDescription'),
      images: [`${BASE_URL}/api/og`],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/landing`,
      languages: {
        en: `${BASE_URL}/en/landing`,
        tr: `${BASE_URL}/tr/landing`,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body style={{ backgroundColor: 'black', margin: 0, overflow: 'hidden' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Project Truth',
              applicationCategory: 'ResearchApplication',
              description: 'Open-source 3D network visualization platform for investigative journalism',
              url: BASE_URL,
              author: { '@type': 'Person', name: 'Raşit Altunç' },
              license: 'https://www.gnu.org/licenses/agpl-3.0.html',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              operatingSystem: 'Web',
              programmingLanguage: ['TypeScript', 'JavaScript'],
            }),
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <AuthProviderWrapper>
            {children}
          </AuthProviderWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
