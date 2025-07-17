// app/dashboard/[guildId]/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // Dinamik rota parametrelerini almak için

// Discord Guild (Sunucu) tipi tanımlaması
interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

// Bot yapılandırma tipi tanımlaması (MongoDB'den gelecek)
interface GuildConfig {
  guildId: string;
  rolePanelChannelId?: string;
  rolePanelMessageId?: string;
  configurableRoleIds: string[];
  roleEmojiMappings: { [roleId: string]: { id?: string; name: string; animated?: boolean } };
  faceitLevelRoles: { [level: string]: string }; // "1": "roleId1", "2": "roleId2"
}

export default function GuildSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams(); // URL parametrelerini al
  const guildId = params.guildId as string; // guildId'yi al

  const [guildDetails, setGuildDetails] = useState<DiscordGuild | null>(null); // Sunucu detayları
  const [guildConfig, setGuildConfig] = useState<GuildConfig | null>(null); // Bot yapılandırması
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Oturum kontrolü ve sunucu detaylarını/yapılandırmasını getirme
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      if (!session || !session.accessToken) {
        setError("Yetkisiz erişim. Lütfen tekrar giriş yapın.");
        setLoading(false);
        router.push('/');
        return;
      }

      try {
        // 1. Discord API'den sunucu detaylarını al (kullanıcının erişim token'ı ile)
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        if (!guildRes.ok) {
          const errorData = await guildRes.json();
          throw new Error(errorData.message || `Discord API'den sunucu detayları alınamadı: ${guildRes.status}`);
        }
        const details: DiscordGuild = await guildRes.json();
        setGuildDetails(details);

        // 2. Kendi API rotamızdan bot yapılandırmasını al
        const configRes = await fetch(`/api/guilds/${guildId}/config`);

        if (!configRes.ok) {
          const errorData = await configRes.json();
          throw new Error(errorData.message || `Bot yapılandırması alınamadı: ${configRes.status}`);
        }
        const config: GuildConfig = await configRes.json();
        setGuildConfig(config);

      } catch (err: any) {
        console.error("Sunucu ayarları yüklenirken hata:", err);
        setError(err.message || "Sunucu ayarları yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    if (session && guildId) {
      fetchData();
    }
  }, [session, guildId, router]); // Bağımlılıklar: session, guildId, router

  // Oturum yüklenirken veya kullanıcı giriş yapmamışsa
  if (status === 'loading' || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        <p style={{ fontSize: '1.2em', color: '#333' }}>Sunucu ayarları yükleniyor...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        <p style={{ fontSize: '1.2em', color: 'red' }}>Hata: {error}</p>
      </div>
    );
  }

  if (!guildDetails) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        <p style={{ fontSize: '1.2em', color: '#333' }}>Sunucu bulunamadı veya erişim yetkiniz yok.</p>
      </div>
    );
  }

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
        {guildDetails.name} Ayarları
      </h1>

      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px 50px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '900px',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
          {guildDetails.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guildDetails.id}/${guildDetails.icon}.png?size=128`}
              alt={`${guildDetails.name} icon`}
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #7289da' }}
            />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#7289da', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '2em', fontWeight: 'bold' }}>
              {guildDetails.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 style={{ fontSize: '2em', margin: '0', color: '#333' }}>{guildDetails.name}</h2>
            <p style={{ fontSize: '0.9em', color: '#777', margin: '5px 0 0 0' }}>Sunucu ID: {guildDetails.id}</p>
          </div>
        </div>

        {/* Rol Paneli Ayarları Bölümü */}
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '1.5em', color: '#333', marginBottom: '20px' }}>Rol Paneli Ayarları</h3>
          <p style={{ fontSize: '1em', color: '#666' }}>
            Burada botunuzun Discord'da rol seçim paneli için kullanacağı rolleri ve diğer ayarları yapılandırabilirsiniz.
          </p>
          <div style={{ backgroundColor: '#f0f2f5', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Yapılandırılabilir Rol ID'leri:</p>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              {guildConfig?.configurableRoleIds && guildConfig.configurableRoleIds.length > 0 ? (
                guildConfig.configurableRoleIds.map(roleId => (
                  <li key={roleId} style={{ backgroundColor: '#e9ecef', padding: '8px 12px', borderRadius: '5px', marginBottom: '5px', fontSize: '0.9em', display: 'inline-block', marginRight: '10px' }}>
                    {roleId}
                  </li>
                ))
              ) : (
                <p style={{ color: '#888' }}>Henüz yapılandırılmış rol yok.</p>
              )}
            </ul>
            {/* Gelecekte buraya rol seçimi ve kaydetme formu eklenecek */}
          </div>
        </section>

        {/* Faceit Rol Ayarları Bölümü */}
        <section>
          <h3 style={{ fontSize: '1.5em', color: '#333', marginBottom: '20px' }}>Faceit Rol Ayarları</h3>
          <p style={{ fontSize: '1em', color: '#666' }}>
            Faceit seviyelerine göre otomatik olarak atanacak Discord rollerini burada belirleyebilirsiniz.
          </p>
          <div style={{ backgroundColor: '#f0f2f5', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Faceit Seviyesi - Rol Eşleşmeleri:</p>
            {guildConfig?.faceitLevelRoles && Object.keys(guildConfig.faceitLevelRoles).length > 0 ? (
              <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                {Object.entries(guildConfig.faceitLevelRoles).map(([level, roleId]) => (
                  <li key={level} style={{ backgroundColor: '#e9ecef', padding: '8px 12px', borderRadius: '5px', marginBottom: '5px', fontSize: '0.9em', display: 'inline-block', marginRight: '10px' }}>
                    Seviye {level}: {roleId}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#888' }}>Henüz Faceit seviyesi için tanımlı rol yok.</p>
            )}
            {/* Gelecekte buraya Faceit seviyesi-rol eşleştirme formu eklenecek */}
          </div>
        </section>

        {/* Geri Dön Butonu */}
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '12px 25px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1em',
              fontWeight: 'bold',
              transition: 'background-color 0.3s ease, transform 0.2s ease',
              boxShadow: '0 4px 10px rgba(108,117,125,0.3)'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5a6268', e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6c757d', e.currentTarget.style.transform = 'translateY(0)')}
          >
            Tüm Sunuculara Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
}
