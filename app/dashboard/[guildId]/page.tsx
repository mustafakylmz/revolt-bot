// app/dashboard/[guildId]/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

interface GuildConfig {
  guildId: string;
  configurableRoleIds?: string[];
  faceitLevelRoles?: { [key: string]: string };
  roleEmojiMappings?: { [key: string]: { id: string; name: string; animated: boolean } };
}

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
}

export default function GuildDashboardPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;

  const [guild, setGuild] = useState<Guild | null>(null);
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session && guildId) {
      fetchGuildData();
    }
  }, [session, guildId]);

  const fetchGuildData = async () => {
    try {
      // Fetch guild info
      const guildResponse = await fetch(`/api/discord/guilds`);
      if (guildResponse.ok) {
        const guildData = await guildResponse.json();
        const currentGuild = guildData.guilds.find((g: Guild) => g.id === guildId);
        if (!currentGuild) {
          router.push('/dashboard');
          return;
        }
        setGuild(currentGuild);
      }

      // Fetch guild config
      const configResponse = await fetch(`/api/guilds/${guildId}/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData.config || { guildId });
      }

      // Fetch roles (this would need to be implemented)
      // For now, we'll use empty array
      setRoles([]);

    } catch (error) {
      console.error('Guild verileri alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Ayarlar başarıyla kaydedildi!');
      } else {
        alert('Ayarlar kaydedilirken hata oluştu.');
      }
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      alert('Ayarlar kaydedilirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-discord-blurple"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-600 mb-6">Bu sayfaya erişmek için giriş yapmalısınız.</p>
          <Link href="/" className="bg-discord-blurple text-white px-6 py-3 rounded-lg font-semibold hover:bg-discord-blurple/90 transition-colors">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Sunucu Bulunamadı</h1>
          <p className="text-gray-600 mb-6">Bu sunucuya erişim izniniz bulunmuyor.</p>
          <Link href="/dashboard" className="bg-discord-blurple text-white px-6 py-3 rounded-lg font-semibold hover:bg-discord-blurple/90 transition-colors">
            Dashboard'a Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-discord-blurple hover:text-discord-blurple/80">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              {guild.icon ? (
                <Image
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                  alt={guild.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-discord-blurple rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {guild.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{guild.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="bg-discord-green text-white px-4 py-2 rounded-lg font-semibold hover:bg-discord-green/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Panel - Bot Komutları */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Bot Komutları</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">/send-role-panel</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Belirtilen kanala rol seçim paneli gönderir.
                  </p>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                    /send-role-panel [kanal]
                  </code>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">/refresh-role-panel</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Mevcut rol seçim panelini günceller.
                  </p>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                    /refresh-role-panel
                  </code>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">/faceit-role-button</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Faceit rol talep butonunu gönderir.
                  </p>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                    /faceit-role-button
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Panel - Ayarlar */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Rol Ayarları */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Rol Yönetimi Ayarları</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yapılandırılabilir Roller
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    Kullanıcıların seçebileceği roller. Bu rolleri /send-role-panel komutu ile ayarlayabilirsiniz.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {config?.configurableRoleIds && config.configurableRoleIds.length > 0 ? (
                      <div className="space-y-2">
                        {config.configurableRoleIds.map((roleId) => (
                          <div key={roleId} className="flex items-center justify-between bg-white p-2 rounded">
                            <span className="text-sm font-medium">Rol ID: {roleId}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center">
                        Henüz yapılandırılmış rol bulunmuyor. Discord'da /send-role-panel komutunu kullanın.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Faceit Ayarları */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Faceit Entegrasyonu</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faceit Seviye Rolleri
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    Her Faceit seviyesi için atanacak rol ID'lerini belirleyin.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700 w-16">
                          Seviye {level}:
                        </label>
                        <input
                          type="text"
                          placeholder="Rol ID"
                          value={config?.faceitLevelRoles?.[level.toString()] || ''}
                          onChange={(e) => {
                            if (config) {
                              setConfig({
                                ...config,
                                faceitLevelRoles: {
                                  ...config.faceitLevelRoles,
                                  [level.toString()]: e.target.value
                                }
                              });
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bot Durumu */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Bot Durumu</h3>
                
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Bot Aktif</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-discord-blurple">
                      {config?.configurableRoleIds?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Yapılandırılmış Rol</div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-discord-green">
                      {Object.keys(config?.faceitLevelRoles || {}).length}
                    </div>
                    <div className="text-sm text-gray-600">Faceit Seviye Rolü</div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-discord-yellow">24/7</div>
                    <div className="text-sm text-gray-600">Çalışma Süresi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}