/**
 * /app/v2/setup/layout.tsx
 * Special layout for setup page that doesn't require authentication
 */

import type { ReactNode } from 'react';

export const metadata = {
  title: 'Setup Account - TLP Agency',
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  // Don't use OrgProvider here - setup page is public/pre-auth
  return <>{children}</>;
}
