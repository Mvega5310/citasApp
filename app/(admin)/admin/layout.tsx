import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  manifest: '/admin-manifest.json',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
