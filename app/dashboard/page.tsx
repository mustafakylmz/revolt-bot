// app/dashboard/page.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      fetchUserGuilds();
    }
  }, [session]);

  const fetchUserGuilds = async () => {
    try {
      const response = await fetch('/api/discord/guilds');
      if (response.ok) {
        const data = await response.json();
        setGuilds(data.guilds || []);
      }
    } catch (error) {
      console.error('Sunucular alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
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

  return (
    <div className="min-h-screen bg-revolt-dark">
      {/* Header */}
      <header className="bg-revolt-darker border-b border-revolt-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-revolt-red to-revolt-red/80 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all shadow-lg shadow-revolt-red/20">
                  <span className="text-white font-extrabold text-lg">R</span>
                </div>
                <span className="text-xl font-bold text-white tracking-tight">Revolt Bot</span>
              </Link>
              <div className="h-6 w-px bg-revolt-border hidden md:block"></div>
              <span className="text-revolt-text-muted hidden md:block">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt="Profil"
                  width={36}
                  height={36}
                  className="rounded-full ring-2 ring-revolt-border"
                />
              )}
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-white">{session.user?.name}</div>
                <div className="text-xs text-revolt-text-muted">@{session.user?.id?.slice(0, 8)}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-revolt-card hover:bg-revolt-muted border border-revolt-border text-revolt-text-muted hover:text-white px-4 py-2 rounded-lg font-medium text-sm transition-all"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Sunucularınız</h2>
          <p className="text-revolt-text-muted">
            Botun bulunduğu sunucuları yönetmek için aşağıdan birini seçin.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-12 h-12 border-4 border-revolt-border border-t-revolt-accent rounded-full animate-spin"></div>
          </div>
        ) : guilds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {guilds.map((guild) => (
              <Link
                key={guild.id}
                href={`/dashboard/${guild.id}`}
                className="bg-revolt-card border border-revolt-border rounded-2xl p-6 hover:border-revolt-red/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {guild.icon ? (
                    <Image
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt={guild.name}
                      width={56}
                      height={56}
                      className="rounded-xl"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-revolt-accent/20 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      {guild.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate group-hover:text-revolt-red transition-colors">
                      {guild.name}
                    </h3>
                    <p className="text-sm text-revolt-text-muted font-mono">
                      {guild.id}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-revolt-text-muted group-hover:text-revolt-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-revolt-green/10 text-revolt-green border border-revolt-green/20">
                    <span className="w-1.5 h-1.5 bg-revolt-green rounded-full"></span>
                    Bot Aktif
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-revolt-card border border-revolt-border rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-revolt-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4M7 7h10M7 11h4" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-3">
                Henüz Sunucu Bulunamadı
              </h3>
              <p className="text-revolt-text-muted mb-8">
                Botun bulunduğu bir sunucu bulunamadı. Önce botu sunucunuza davet etmelisiniz.
              </p>
              <a
                href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=268435456&scope=bot%20applications.commands`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-revolt-accent hover:bg-revolt-accent-hover text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Botu Sunucuma Davet Et
              </a>
            </div>
          </div>
        )}

        {/* Bot Bilgileri */}
        <div className="mt-12 bg-revolt-card border border-revolt-border rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">Bot Özellikleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 bg-revolt-darker rounded-xl border border-revolt-border">
              <div className="w-10 h-10 bg-revolt-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-revolt-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-1">Rol Yönetimi</h4>
                <p className="text-sm text-revolt-text-muted">Kullanıcılar kendi rollerini seçebilir ve yönetebilir.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-revolt-darker rounded-xl border border-revolt-border">
              <div className="w-10 h-10 bg-revolt-yellow/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-revolt-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-1">Faceit Entegrasyonu</h4>
                <p className="text-sm text-revolt-text-muted">Otomatik Faceit seviye kontrolü ve rol ataması.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}