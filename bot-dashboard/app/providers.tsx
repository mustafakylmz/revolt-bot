// app/providers.tsx
'use client'; // Bu dosyanın bir istemci bileşeni olduğunu belirtir

import { SessionProvider } from 'next-auth/react';
import React from 'react';

// Bu bileşen, SessionProvider'ı sarmalar ve tüm alt bileşenlere oturum erişimi sağlar.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
