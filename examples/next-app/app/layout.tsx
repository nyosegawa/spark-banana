import type { Metadata } from 'next';
import Spark from './spark';
import './globals.css';

export const metadata: Metadata = {
  title: 'Todo App — spark-banana example',
  description: 'Next.js example for spark-banana',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Spark />
      </body>
    </html>
  );
}
