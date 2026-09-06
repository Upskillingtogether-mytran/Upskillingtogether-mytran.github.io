import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ABC Tutoring | Find the right tutor for your child',
  description:
    'Personalized, one-hour tutoring in math, science, and elementary reading. Find a tutor and choose a time that works for your family.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
