import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GhostOffice - Civic Observability Platform',
  description: 'Elastic-Powered Civic Observability & Accountability Intelligence Platform for Bengaluru',
  keywords: ['civic', 'observability', 'bengaluru', 'complaints', 'government', 'accountability'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
