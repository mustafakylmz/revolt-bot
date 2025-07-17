// app/layout.tsx
import './globals.css'; // Global CSS stillerinizi içe aktarın
import { Inter } from 'next/font/google';
import { Providers } from './providers'; // Yeni Providers bileşenini içe aktarın

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
        {/* Providers bileşeni ile tüm uygulamayı sarın. */}
        {/* Providers bileşeni bir istemci bileşeni olduğu için React Context hatasını önler. */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
