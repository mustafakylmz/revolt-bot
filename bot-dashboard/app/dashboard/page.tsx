// app/dashboard/page.tsx
'use client'; // Bu bileşenin client tarafında (tarayıcıda) çalışacağını belirtir

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react'; // useState ve useEffect hook'larını içe aktar

// Discord Guild (Sunucu) tipi tanımlaması
interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // İzin bitmask'i string olarak gelir
  features: string[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]); // Sunucuları depolamak için state
  const [loadingGuilds, setLoadingGuilds] = useState(true); // Sunucu yükleme durumu
  const [errorGuilds, setErrorGuilds] = useState<string | null>(null); // Sunucu yükleme hatası

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
    return null;
  }

  // Sunucuları getirme işlemi
  useEffect(() => {
    const fetchGuilds = async () => {
      setLoadingGuilds(true);
      setErrorGuilds(null);
      try {
        // Yeni oluşturduğumuz API rotasını çağır
        const res = await fetch('/api/discord/guilds');
        const data = await res.json();

        if (res.ok) {
          setGuilds(data); // Sunucuları state'e kaydet
        } else {
          setErrorGuilds(data.message || 'Sunucular alınamadı.'); // Hata mesajını kaydet
          console.error("Sunucu API hatası:", data);
        }
      } catch (error) {
        console.error("Sunucuları alırken hata:", error);
        setErrorGuilds('Sunucuları alırken beklenmeyen bir hata oluştu.');
      } finally {
        setLoadingGuilds(false); // Yükleme durumunu bitir
      }
    };

    // Oturum varsa sunucuları getir
    if (session) {
      fetchGuilds();
    }
  }, [session]); // session değiştiğinde tekrar çalıştır

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
          Yönettiğiniz Sunucular
        </h2>

        {loadingGuilds ? (
          <p>Sunucular yükleniyor...</p>
        ) : errorGuilds ? (
          <p style={{ color: 'red' }}>Hata: {errorGuilds}</p>
        ) : guilds.length === 0 ? (
          <p>Yönetebileceğiniz bir sunucu bulunamadı. Lütfen Discord'da en az bir sunucuda "Sunucuyu Yönet" iznine sahip olduğunuzdan emin olun.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {guilds.map((guild) => (
              <div key={guild.id} style={{
                backgroundColor: '#f9f9f9',
                padding: '15px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                border: '1px solid #e0e0e0'
              }}>
                {guild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                    alt={`${guild.name} icon`}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#7289da', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '1.5em', fontWeight: 'bold' }}>
                    {guild.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#333' }}>{guild.name}</span>
                {/* Gelecekte buraya sunucu ayarları linki eklenecek */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
