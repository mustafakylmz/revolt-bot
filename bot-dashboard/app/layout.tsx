// app/layout.tsx
import './globals.css'; // Global CSS stillerinizi içe aktarın
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react'; // NextAuth SessionProvider'ı içe aktarın

const inter = Inter({ subsets: ['latin'] });

// Uygulamanızın meta verileri (tarayıcı başlığı, açıklama vb.)
export const metadata = {
  title: 'Bot Yönetim Paneli',
  description: 'Discord Botunuz için Yönetim Paneli',
};

// Ana düzen bileşeni
export default function RootLayout({
  children, // Sayfa içeriğini temsil eder
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {/* SessionProvider ile tüm uygulamayı sarın. */}
        {/* Bu, NextAuth'ın client-side oturum yönetimi için gereklidir. */}
        {/* Oturum verileri, alt bileşenlerde useSession hook'u aracılığıyla erişilebilir olacaktır. */}
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
