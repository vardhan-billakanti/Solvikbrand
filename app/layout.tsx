import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SolvikBrand — Cybersecurity Investigation Platform',
    template: '%s | SolvikBrand',
  },
  description:
    'Professional cybersecurity investigation and digital forensics platform. Generate secure tracking links, collect browser intelligence, and analyze visitor data.',
  keywords: ['cybersecurity', 'investigation', 'tracking', 'digital forensics', 'OSINT', 'SolvikBrand'],
  openGraph: {
    title: 'SolvikBrand — Cybersecurity Investigation Platform',
    description: 'Professional cybersecurity investigation and digital forensics platform.',
    type: 'website',
  },
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
