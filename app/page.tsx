// app/page.tsx
'use client';

import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-revolt-dark flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-revolt-border border-t-revolt-accent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-revolt-dark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-revolt-darker/80 backdrop-blur-xl border-b border-revolt-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/revolt-icon.png"
              alt="Revolt Logo"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-xl font-bold text-white tracking-tight">Revolt Bot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#features" className="text-revolt-text-muted hover:text-white transition-colors">
              Özellikler
            </Link>
            {session ? (
              <Link
                href="/dashboard"
                className="bg-revolt-red hover:bg-revolt-red/90 text-white px-5 py-2.5 rounded-lg font-semibold transition-all hover:scale-105"
              >
                Dashboard
              </Link>
            ) : (
              <button
                onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
                className="bg-revolt-red hover:bg-revolt-red/90 text-white px-5 py-2.5 rounded-lg font-semibold transition-all hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-revolt-card border border-revolt-border rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-revolt-green rounded-full animate-pulse"></span>
            <span className="text-sm text-revolt-text-muted">7/24 Aktif</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Discord Sunucunuz İçin
            <span className="block text-revolt-red">Akıllı Rol Yönetimi</span>
          </h1>
          <p className="text-xl text-revolt-text-muted max-w-2xl mx-auto mb-10">
            Kullanıcılarınız kendi rollerini seçebilsin, Faceit seviyelerine göre otomatik rol atansın. 
            Tek bir komutla kurulum, sonsuz kolaylık.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {session ? (
<Link
              href="/dashboard"
              className="bg-revolt-red hover:bg-revolt-red/90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full sm:w-auto shadow-lg shadow-revolt-red/30"
            >
              Dashboard&apos;a Git
            </Link>
            ) : (
              <button
                onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
                className="bg-revolt-red hover:bg-revolt-red/90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full sm:w-auto flex items-center justify-center gap-3 shadow-lg shadow-revolt-red/30"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord ile Başla
              </button>
            )}
            <a
              href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=268435456&scope=bot%20applications.commands`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-revolt-card hover:bg-revolt-muted border border-revolt-border text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full sm:w-auto"
            >
              Botu Davet Et
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-revolt-darker">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Neden Revolt Bot?</h2>
            <p className="text-revolt-text-muted text-lg max-w-xl mx-auto">
              Sadece bir Discord botu değil, sunucunuzu bir üst seviyeye taşıyacak araç.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-revolt-card border border-revolt-border rounded-2xl p-8 hover:border-revolt-red/50 transition-all group">
              <div className="w-14 h-14 bg-revolt-red/10 border border-revolt-red/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-revolt-red/20 transition-colors">
                <svg className="w-7 h-7 text-revolt-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Otomatik Rol Yönetimi</h3>
              <p className="text-revolt-text-muted leading-relaxed">
                Kullanıcılarınız istedikleri rolleri seçebilsin. Buton tıklamasıyla anında rol ataması, panel güncelleme derdi yok.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-revolt-card border border-revolt-border rounded-2xl p-8 hover:border-revolt-red/50 transition-all group">
              <div className="w-14 h-14 bg-revolt-green/10 border border-revolt-green/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-revolt-green/20 transition-colors">
                <svg className="w-7 h-7 text-revolt-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Faceit Entegrasyonu</h3>
              <p className="text-revolt-text-muted leading-relaxed">
                Faceit seviyenizi kontrol eder ve otomatik olarak uygun rolü atar. 1-10 seviye arası, hepsi otomatik.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-revolt-card border border-revolt-border rounded-2xl p-8 hover:border-revolt-red/50 transition-all group">
              <div className="w-14 h-14 bg-revolt-red/10 border border-revolt-red/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-revolt-red/20 transition-colors">
                <svg className="w-7 h-7 text-revolt-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Anında Kurulum</h3>
              <p className="text-revolt-text-muted leading-relaxed">
                Tek bir slash komutuyla her şey aktif. Discord&apos;a özel tasarlanmış, kullanımı kolay arayüz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-revolt-card border border-revolt-border rounded-2xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-revolt-red mb-2">7/24</div>
                <div className="text-revolt-text-muted text-sm">Çalışma Süresi</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-revolt-green mb-2">100%</div>
                <div className="text-revolt-text-muted text-sm">Ücretsiz</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-revolt-yellow mb-2">10+</div>
                <div className="text-revolt-text-muted text-sm">Faceit Seviye</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-white mb-2">∞</div>
                <div className="text-revolt-text-muted text-sm">Sunucu Limiti</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Hemen Başlayın
          </h2>
          <p className="text-revolt-text-muted text-lg mb-8">
            Discord hesabınızla giriş yapın ve sunucunuzu yönetmeye başlayın. Ücretsiz, kurulum gerektirmez.
          </p>
{session ? (
              <Link
                href="/dashboard"
                className="inline-block bg-revolt-red hover:bg-revolt-red/90 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-revolt-red/30"
              >
                Dashboard&apos;a Git
              </Link>
            ) : (
              <button
                onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
                className="inline-block bg-revolt-red hover:bg-revolt-red/90 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-revolt-red/30"
              >
                Discord ile Giriş Yap
              </button>
            )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-revolt-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/revolt-icon.png"
              alt="Revolt Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-revolt-text-muted text-sm">© 2024 Revolt Bot. Tüm hakları saklıdır.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-revolt-text-muted hover:text-white text-sm transition-colors">Gizlilik</a>
            <a href="#" className="text-revolt-text-muted hover:text-white text-sm transition-colors">Koşullar</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
