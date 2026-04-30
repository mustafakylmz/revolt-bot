// app/dashboard/[guildId]/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
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

  const fetchGuildData = useCallback(async () => {
    try {
      const guildResponse = await fetch(`/api/discord/guilds`);
      if (guildResponse.ok) {
        const guildData = await guildResponse.json();
        const guildsArray = Array.isArray(guildData) ? guildData : (guildData.guilds || []);
        const currentGuild = guildsArray.find((g: Guild) => g.id === guildId);
        if (!currentGuild) {
          router.push('/dashboard');
          return;
        }
        setGuild(currentGuild);
      }

      const configResponse = await fetch(`/api/guilds/${guildId}/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData.config || { guildId });
      }

      setRoles([]);

    } catch (error) {
      console.error('Guild verileri alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [guildId, router]);

  useEffect(() => {
    if (session && guildId) {
      fetchGuildData();
    }
  }, [session, guildId, fetchGuildData]);

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
      <div className="min-h-screen bg-revolt-dark flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-revolt-border border-t-revolt-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-revolt-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-revolt-card border border-revolt-border rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-revolt-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Erişim Reddedildi</h1>
          <p className="text-revolt-text-muted mb-6">Bu sayfaya erişmek için giriş yapmalısınız.</p>
          <Link href="/" className="inline-block bg-revolt-accent hover:bg-revolt-accent-hover text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen bg-revolt-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h1 className="text-2xl font-bold text-white mb-4">Sunucu Bulunamadı</h1>
          <p className="text-revolt-text-muted mb-6">Bu sunucuya erişim izniniz bulunmuyor.</p>
          <Link href="/dashboard" className="inline-block bg-revolt-accent hover:bg-revolt-accent-hover text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105">
            Dashboard&apos;a Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-revolt-dark">
      {/* Header */}
      <header className="bg-revolt-darker border-b border-revolt-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-revolt-text-muted hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              {guild.icon ? (
                <Image
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                  alt={guild.name}
                  width={36}
                  height={36}
                  className="rounded-xl"
                />
              ) : (
                <div className="w-9 h-9 bg-revolt-accent rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  {guild.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-xl font-bold text-white">{guild.name}</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="bg-revolt-red hover:bg-revolt-red/90 text-white px-5 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-revolt-red/20"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-revolt-dark/30 border-t-revolt-dark rounded-full animate-spin"></div>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Panel - Bot Komutları */}
          <div className="lg:col-span-1">
            <div className="bg-revolt-card border border-revolt-border rounded-2xl p-6 sticky top-24">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-revolt-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Bot Komutları
              </h3>
              
              <div className="space-y-4">
                <div className="bg-revolt-darker p-4 rounded-xl border border-revolt-border">
                  <h4 className="font-semibold text-white mb-2 text-sm">/send-role-panel</h4>
                  <p className="text-xs text-revolt-text-muted mb-3">
                    Belirtilen kanala rol seçim paneli gönderir.
                  </p>
                  <code className="text-xs bg-revolt-dark px-2 py-1 rounded text-revolt-accent font-mono">
                    /send-role-panel [kanal]
                  </code>
                </div>

                <div className="bg-revolt-darker p-4 rounded-xl border border-revolt-border">
                  <h4 className="font-semibold text-white mb-2 text-sm">/refresh-role-panel</h4>
                  <p className="text-xs text-revolt-text-muted mb-3">
                    Mevcut rol seçim panelini günceller.
                  </p>
                  <code className="text-xs bg-revolt-dark px-2 py-1 rounded text-revolt-accent font-mono">
                    /refresh-role-panel
                  </code>
                </div>

                <div className="bg-revolt-darker p-4 rounded-xl border border-revolt-border">
                  <h4 className="font-semibold text-white mb-2 text-sm">/faceit-role-button</h4>
                  <p className="text-xs text-revolt-text-muted mb-3">
                    Faceit rol talep butonunu gönderir.
                  </p>
                  <code className="text-xs bg-revolt-dark px-2 py-1 rounded text-revolt-accent font-mono">
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
              <div className="bg-revolt-card border border-revolt-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-revolt-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Rol Yönetimi Ayarları
                </h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Yapılandırılabilir Roller
                  </label>
                  <p className="text-sm text-revolt-text-muted mb-4">
                    Kullanıcıların seçebileceği roller. Bu rolleri /send-role-panel komutu ile ayarlayabilirsiniz.
                  </p>
                  <div className="bg-revolt-darker p-4 rounded-xl border border-revolt-border">
                    {config?.configurableRoleIds && config.configurableRoleIds.length > 0 ? (
                      <div className="space-y-2">
                        {config.configurableRoleIds.map((roleId) => (
                          <div key={roleId} className="flex items-center justify-between bg-revolt-dark p-3 rounded-lg">
                            <span className="text-sm font-medium text-white font-mono">{roleId}</span>
                            <span className="text-xs text-revolt-text-muted">Rol</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-revolt-text-muted text-center py-4">
                        Henüz yapılandırılmış rol bulunmuyor. Discord&apos;da /send-role-panel komutunu kullanın.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Faceit Ayarları */}
              <div className="bg-revolt-card border border-revolt-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-revolt-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Faceit Entegrasyonu
                </h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Faceit Seviye Rolleri
                  </label>
                  <p className="text-sm text-revolt-text-muted mb-4">
                    Her Faceit seviyesi için atanacak rol ID&apos;lerini belirleyin.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                      <div key={level} className="flex items-center gap-3 bg-revolt-darker p-3 rounded-xl border border-revolt-border">
                        <div className="w-8 h-8 bg-revolt-accent/10 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-revolt-accent">{level}</span>
                        </div>
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
                          className="flex-1 bg-revolt-dark border border-revolt-border rounded-lg px-3 py-2 text-sm text-white placeholder-revolt-text-muted focus:outline-none focus:border-revolt-accent transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bot Durumu */}
              <div className="bg-revolt-card border border-revolt-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-revolt-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bot Durumu
                </h3>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 bg-revolt-green rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-white">Bot Aktif</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-revolt-darker p-4 rounded-xl border border-revolt-border text-center">
                    <div className="text-2xl font-extrabold text-revolt-accent mb-1">
                      {config?.configurableRoleIds?.length || 0}
                    </div>
                    <div className="text-xs text-revolt-text-muted">Yapılandırılmış Rol</div>
                  </div>
                  
                  <div className="bg-revolt-darker p-4 rounded-xl border border-revolt-border text-center">
                    <div className="text-2xl font-extrabold text-revolt-green mb-1">
                      {Object.keys(config?.faceitLevelRoles || {}).length}
                    </div>
                    <div className="text-xs text-revolt-text-muted">Faceit Seviye Rolü</div>
                  </div>
                  
                  <div className="bg-revolt-darker p-4 rounded-xl border border-revolt-border text-center">
                    <div className="text-2xl font-extrabold text-revolt-yellow mb-1">24/7</div>
                    <div className="text-xs text-revolt-text-muted">Çalışma Süresi</div>
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