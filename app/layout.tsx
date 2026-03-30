import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yosemite Model Run Issues',
  description: 'Issues reported via @ModelRunIssue in Slack',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
