// app/dashboard/[guildId]/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Sidebar from '@/components/dashboard/Sidebar';

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Channel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
}

interface Emoji {
  id: string;
  name: string;
  animated: boolean;
  imageUrl: string;
}

interface GuildConfig {
  guildId: string;
  configurableRoleIds?: string[];
  roleEmojiMappings?: { [key: string]: { id: string; name: string; animated: boolean } };
  faceitLevelRoles?: { [key: string]: string };
  rolePanelChannelId?: string;
  rolePanelMessageId?: string;
  faceitPanelChannelId?: string;
  faceitPanelMessageId?: string;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

export default function GuildDashboardPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = params.guildId as string;
  const currentTab = searchParams.get('tab') || 'role-panel';

  const [guild, setGuild] = useState<Guild | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedFaceitRoles, setSelectedFaceitRoles] = useState<{ [level: string]: string }>({});
  const [selectedFaceitChannel, setSelectedFaceitChannel] = useState<string>('');
  const [roleEmojiMappings, setRoleEmojiMappings] = useState<{ [roleId: string]: { id: string; name: string; animated: boolean } }>({});

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchGuildData = useCallback(async () => {
    try {
      // Fetch guild info
      const guildResponse = await fetch('/api/discord/guilds');
      if (guildResponse.ok) {
        const guildData = await guildResponse.json();
        const guildsArray = guildData.guilds || [];
        const currentGuild = guildsArray.find((g: Guild) => g.id === guildId);
        if (!currentGuild) {
          router.push('/dashboard');
          return;
        }
        setGuild(currentGuild);
      }

      // Fetch roles
      const rolesResponse = await fetch(`/api/discord/${guildId}/roles`);
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.roles || []);
      }

      // Fetch channels
      const channelsResponse = await fetch(`/api/discord/${guildId}/channels`);
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        setChannels(channelsData.channels || []);
      }

      // Fetch emojis
      const emojisResponse = await fetch(`/api/discord/${guildId}/emojis`);
      if (emojisResponse.ok) {
        const emojisData = await emojisResponse.json();
        setEmojis(emojisData.emojis || []);
      }

      // Fetch config
      const configResponse = await fetch(`/api/guilds/${guildId}/config`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
        if (configData.configurableRoleIds) {
          setSelectedRoles(configData.configurableRoleIds);
        }
        if (configData.rolePanelChannelId) {
          setSelectedChannel(configData.rolePanelChannelId);
        }
        if (configData.faceitLevelRoles) {
          setSelectedFaceitRoles(configData.faceitLevelRoles);
        }
        if (configData.faceitPanelChannelId) {
          setSelectedFaceitChannel(configData.faceitPanelChannelId);
        }
        if (configData.roleEmojiMappings) {
          setRoleEmojiMappings(configData.roleEmojiMappings);
        }
      }

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

  const handleRoleSelection = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleEmojiSelection = (roleId: string, emoji: Emoji | null) => {
    setRoleEmojiMappings(prev => {
      const updated = { ...prev };
      if (emoji) {
        updated[roleId] = { id: emoji.id, name: emoji.name, animated: emoji.animated };
      } else {
        delete updated[roleId];
      }
      return updated;
    });
  };

  const sendRolePanel = async () => {
    if (!selectedChannel) {
      showNotification('error', 'Lütfen bir kanal seçin.');
      return;
    }
    if (selectedRoles.length === 0) {
      showNotification('error', 'Lütfen en az bir rol seçin.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/discord/${guildId}/role-panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel,
          roleIds: selectedRoles,
          emojiMappings: roleEmojiMappings,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Rol paneli başarıyla gönderildi!');
      } else {
        showNotification('error', data.message || 'Rol paneli gönderilemedi.');
      }
    } catch (error) {
      showNotification('error', 'Rol paneli gönderilirken hata oluştu.');
    } finally {
      setSending(false);
    }
  };

  const saveFaceitRoles = async () => {
    if (!selectedFaceitChannel) {
      showNotification('error', 'Lütfen bir kanal seçin.');
      return;
    }
    const hasAtLeastOneRole = Object.values(selectedFaceitRoles).some(v => v);
    if (!hasAtLeastOneRole) {
      showNotification('error', 'Lütfen en az bir seviye için rol seçin.');
      return;
    }

    setSending(true);
    try {
      const filteredRoles: { [key: string]: string } = {};
      for (const [level, roleId] of Object.entries(selectedFaceitRoles)) {
        if (roleId) {
          filteredRoles[level] = roleId;
        }
      }

      const response = await fetch(`/api/discord/${guildId}/faceit-panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedFaceitChannel,
          faceitLevelRoles: filteredRoles,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('success', 'Faceit paneli başarıyla gönderildi!');
      } else {
        showNotification('error', data.message || 'Faceit paneli gönderilemedi.');
      }
    } catch (error) {
      showNotification('error', 'Faceit paneli gönderilirken hata oluştu.');
    } finally {
      setSending(false);
    }
  };

  const handleFaceitRoleChange = (level: string, roleId: string) => {
    setSelectedFaceitRoles(prev => ({
      ...prev,
      [level]: roleId,
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-revolt-dark flex">
        <div className="w-64 bg-revolt-darker border-r border-revolt-border flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-revolt-border border-t-revolt-accent rounded-full animate-spin"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-revolt-border border-t-revolt-accent rounded-full animate-spin"></div>
        </div>
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
    <div className="min-h-screen bg-revolt-dark flex">
      {/* Sidebar */}
      <Sidebar
        guildId={guildId}
        guildName={guild.name}
        guildIcon={guild.icon}
        currentPage={currentTab}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl ${
            notification.type === 'success'
              ? 'bg-revolt-green/20 border border-revolt-green/50 text-revolt-green'
              : 'bg-revolt-red/20 border border-revolt-red/50 text-revolt-red'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-revolt-darker border-b border-revolt-border px-6 py-4">
          <h1 className="text-xl font-bold text-white">
            {currentTab === 'role-panel' ? 'Rol Paneli' : 'Faceit Paneli'}
          </h1>
          <p className="text-sm text-revolt-text-muted mt-1">
            {currentTab === 'role-panel'
              ? 'Kullanıcıların seçebileceği rolleri belirleyin ve paneli gönderin.'
              : 'Her seviye için atanacak rolleri seçin ve paneli gönderin.'}
          </p>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {currentTab === 'role-panel' && (
            <div className="max-w-3xl">
              <div className="bg-revolt-card border border-revolt-border rounded-2xl overflow-hidden">
                <div className="p-6 space-y-5">
                  {/* Kanal Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-revolt-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Kanal Seç
                      </span>
                    </label>
                    <select
                      value={selectedChannel}
                      onChange={(e) => setSelectedChannel(e.target.value)}
                      className="w-full bg-revolt-dark border border-revolt-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-revolt-accent transition-colors"
                    >
                      <option value="">Kanal seçin...</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rol Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-revolt-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Roller (çoklu seçim)
                      </span>
                    </label>
                    <div className="bg-revolt-dark border border-revolt-border rounded-lg p-3 max-h-80 overflow-y-auto space-y-1">
                      {roles.length === 0 ? (
                        <p className="text-sm text-revolt-text-muted text-center py-4">Roller yükleniyor...</p>
                      ) : (
                        roles.map((role) => (
                          <div
                            key={role.id}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              selectedRoles.includes(role.id)
                                ? 'bg-revolt-accent/20 border border-revolt-accent/50'
                                : 'hover:bg-revolt-darker'
                            }`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedRoles.includes(role.id)}
                                onChange={() => handleRoleSelection(role.id)}
                                className="w-4 h-4 rounded border-revolt-border bg-revolt-dark text-revolt-accent focus:ring-revolt-accent focus:ring-offset-0"
                              />
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: role.color }}
                              ></span>
                              <span className="text-sm text-white">{role.name}</span>
                            </label>
                            {selectedRoles.includes(role.id) && (
                              <div className="mt-2 ml-7 flex items-center gap-2">
                                <span className="text-xs text-revolt-text-muted">Emoji:</span>
                                <select
                                  value={roleEmojiMappings[role.id]?.id || ''}
                                  onChange={(e) => {
                                    const emojiId = e.target.value;
                                    const emoji = emojiId ? emojis.find((em) => em.id === emojiId) : null;
                                    handleEmojiSelection(role.id, emoji);
                                  }}
                                  className="flex-1 bg-revolt-darker border border-revolt-border rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-revolt-accent max-w-[180px]"
                                >
                                  <option value="">Emoji seç...</option>
                                  {emojis.map((emoji) => (
                                    <option key={emoji.id} value={emoji.id}>
                                      {emoji.name}
                                    </option>
                                  ))}
                                </select>
                                {roleEmojiMappings[role.id] && (
                                  <Image
                                    src={emojis.find((em) => em.id === roleEmojiMappings[role.id]?.id)?.imageUrl || ''}
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="w-5 h-5"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {selectedRoles.length > 0 && (
                      <p className="text-xs text-revolt-text-muted mt-2">
                        {selectedRoles.length} rol seçildi
                      </p>
                    )}
                  </div>

                  {/* Gönder Butonu */}
                  <button
                    onClick={sendRolePanel}
                    disabled={sending || !selectedChannel || selectedRoles.length === 0}
                    className="w-full bg-revolt-red hover:bg-revolt-red/90 disabled:bg-revolt-darker disabled:text-revolt-text-muted text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Rol Panelini Gönder
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'faceit-panel' && (
            <div className="max-w-3xl">
              <div className="bg-revolt-card border border-revolt-border rounded-2xl overflow-hidden">
                <div className="p-6 space-y-5">
                  {/* Kanal Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-revolt-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Kanal Seç
                      </span>
                    </label>
                    <select
                      value={selectedFaceitChannel}
                      onChange={(e) => setSelectedFaceitChannel(e.target.value)}
                      className="w-full bg-revolt-dark border border-revolt-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-revolt-accent transition-colors"
                    >
                      <option value="">Kanal seçin...</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Faceit Seviye Roller */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-revolt-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Seviye Rolleri
                      </span>
                    </label>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                        <div key={level} className="flex items-center gap-3 bg-revolt-dark border border-revolt-border rounded-lg p-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            level <= 3 ? 'bg-revolt-red/20 text-revolt-red' :
                            level <= 6 ? 'bg-revolt-yellow/20 text-revolt-yellow' :
                            'bg-revolt-green/20 text-revolt-green'
                          }`}>
                            {level}
                          </div>
                          <select
                            value={selectedFaceitRoles[level.toString()] || ''}
                            onChange={(e) => handleFaceitRoleChange(level.toString(), e.target.value)}
                            className="flex-1 bg-revolt-darker border border-revolt-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-revolt-accent transition-colors"
                          >
                            <option value="">Rol seçin...</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          {selectedFaceitRoles[level.toString()] && (
                            <span className="text-xs text-revolt-green">Aktif</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gönder Butonu */}
                  <button
                    onClick={saveFaceitRoles}
                    disabled={sending || !selectedFaceitChannel || !Object.values(selectedFaceitRoles).some(v => v)}
                    className="w-full bg-revolt-yellow hover:bg-revolt-yellow/90 disabled:bg-revolt-darker disabled:text-revolt-text-muted text-revolt-dark px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Faceit Panelini Gönder
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
