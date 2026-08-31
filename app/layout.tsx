import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Dvideo — Cybersecurity Investigation Platform',
    template: '%s | Dvideo',
  },
  description:
    'Professional cybersecurity investigation and digital forensics platform. Generate secure tracking links, collect browser intelligence, and analyze visitor data.',
  keywords: ['cybersecurity', 'investigation', 'tracking', 'digital forensics', 'OSINT'],
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
