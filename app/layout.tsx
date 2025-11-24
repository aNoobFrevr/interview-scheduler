import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interview Scheduler',
  description: 'Minimal scaffold for managing interviewer slots and bookings'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
