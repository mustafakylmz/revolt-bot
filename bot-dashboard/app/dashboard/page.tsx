// app/dashboard/page.tsx
'use client'; // Bu bileşenin client tarafında (tarayıcıda) çalışacağını belirtir

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Yönlendirme için useRouter hook'u

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Oturum bilgileri yüklenirken
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        <p style={{ fontSize: '1.2em', color: '#333' }}>Dashboard yükleniyor...</p>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa ana sayfaya yönlendir
  if (status === 'unauthenticated') {
    router.push('/');
    return null; // Yönlendirme yapılırken hiçbir şey render etme
  }

  // Kullanıcı giriş yapmışsa dashboard içeriğini göster
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px',
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Inter, sans-serif',
      color: '#333'
    }}>
      <h1 style={{ fontSize: '2.8em', color: '#333', marginBottom: '30px', textAlign: 'center' }}>
        Yönetim Paneli
      </h1>

      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px 50px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '800px',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left'
      }}>
        <p style={{ fontSize: '1.2em', marginBottom: '15px' }}>
          Hoş geldin, <span style={{ fontWeight: 'bold', color: '#7289da' }}>{session?.user?.name || 'Kullanıcı'}</span>!
        </p>
        <p style={{ fontSize: '1em', color: '#555', marginBottom: '20px' }}>
          Discord ID: <span style={{ fontFamily: 'monospace', backgroundColor: '#eee', padding: '3px 8px', borderRadius: '5px' }}>{session?.user?.id}</span>
        </p>

        <h2 style={{ fontSize: '1.8em', color: '#333', marginTop: '30px', marginBottom: '20px' }}>
          Sunucu Seçimi
        </h2>
        <p style={{ fontSize: '1em', color: '#666' }}>
          Burada yönettiğiniz Discord sunucularını listeleyeceğiz ve her biri için bot ayarlarını yapabileceksiniz.
          Lütfen bekleyin, bu bölümü bir sonraki adımda geliştireceğiz.
        </p>
        {/* Sunucu listesi ve ayar seçenekleri buraya gelecek */}
      </div>
    </div>
  );
}
