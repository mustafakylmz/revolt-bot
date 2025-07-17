// app/page.tsx
'use client'; // Bu bileşenin client tarafında (tarayıcıda) çalışacağını belirtir

import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image'; // Next.js'in optimize edilmiş Image bileşeni

export default function HomePage() {
  // useSession hook'u ile oturum verilerini ve yükleme durumunu al
  const { data: session, status } = useSession();

  // Oturum bilgileri yüklenirken bir yükleme mesajı göster
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        <p style={{ fontSize: '1.2em', color: '#333' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      padding: '20px',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2.5em', color: '#333', marginBottom: '30px' }}>
        Discord Bot Yönetim Paneli
      </h1>

      {session ? (
        // Kullanıcı giriş yapmışsa gösterilecek içerik
        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {session.user?.image && ( // Kullanıcının avatarı varsa göster
            <Image
              src={session.user.image}
              alt="Profil Resmi"
              width={80}
              height={80}
              style={{ borderRadius: '50%', marginBottom: '20px', border: '3px solid #7289da' }}
            />
          )}
          <p style={{ fontSize: '1.5em', color: '#333', marginBottom: '15px' }}>
            Hoş geldin, <span style={{ fontWeight: 'bold', color: '#7289da' }}>{session.user?.name || session.user?.email || 'Kullanıcı'}</span>!
          </p>
          <p style={{ fontSize: '1em', color: '#555', marginBottom: '25px' }}>
            Discord ID: <span style={{ fontFamily: 'monospace', backgroundColor: '#eee', padding: '3px 8px', borderRadius: '5px' }}>{session.user?.id}</span>
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/' })} // Çıkış yap ve ana sayfaya yönlendir
            style={{
              padding: '12px 25px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1em',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              boxShadow: '0 4px 10px rgba(220,53,69,0.3)'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c82333', e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#dc3545', e.currentTarget.style.transform = 'translateY(0)')}
          >
            Çıkış Yap
          </button>
          <p style={{ marginTop: '30px', fontSize: '1em', color: '#666' }}>
            Şimdi sunucu seçimi ve bot ayarlarına geçebiliriz.
          </p>
        </div>
      ) : (
        // Kullanıcı giriş yapmamışsa gösterilecek içerik
        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <p style={{ fontSize: '1.2em', color: '#333', marginBottom: '25px' }}>
            Lütfen devam etmek için Discord ile giriş yapın.
          </p>
          <button
            onClick={() => signIn('discord', { callbackUrl: '/dashboard' })} // Discord ile giriş yap
            style={{
              padding: '15px 30px',
              backgroundColor: '#7289da',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1.3em',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              boxShadow: '0 5px 15px rgba(114,137,218,0.4)'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#677bc4', e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#7289da', e.currentTarget.style.transform = 'translateY(0)')}
          >
            Discord ile Giriş Yap
          </button>
        </div>
      )}
    </div>
  );
}
