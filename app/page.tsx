// app/page.tsx
'use client';

import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-discord-blurple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord-blurple to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Revolt Bot
          </h1>
          <p className="text-xl text-white/80 mb-8">
            Discord sunucunuz için güçlü rol yönetimi ve Faceit entegrasyonu
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Bot Özellikleri */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Bot Özellikleri</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-discord-green rounded-full"></div>
                <span>Otomatik rol yönetimi</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-discord-green rounded-full"></div>
                <span>Faceit seviye entegrasyonu</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-discord-green rounded-full"></div>
                <span>Kolay kurulum ve yönetim</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-discord-green rounded-full"></div>
                <span>7/24 otomatik güncelleme</span>
              </div>
            </div>
          </div>

          {/* Giriş Paneli */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            {session ? (
              <div className="text-center">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt="Profil Resmi"
                    width={80}
                    height={80}
                    className="rounded-full mx-auto mb-4 border-4 border-discord-blurple"
                  />
                )}
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Hoş geldin, {session.user?.name}!
                </h3>
                <p className="text-gray-600 mb-6">
                  Discord ID: {session.user?.id}
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block bg-discord-blurple text-white px-8 py-3 rounded-lg font-semibold hover:bg-discord-blurple/90 transition-colors"
                >
                  Dashboard'a Git
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Başlamaya Hazır mısın?
                </h3>
                <p className="text-gray-600 mb-6">
                  Discord ile giriş yaparak botunuzu yönetmeye başlayın
                </p>
                <button
                  onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
                  className="bg-discord-blurple text-white px-8 py-3 rounded-lg font-semibold hover:bg-discord-blurple/90 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span>Discord ile Giriş Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-white/60">
            Bu bot herkese açıktır ve ücretsiz olarak kullanılabilir.
          </p>
        </div>
      </div>
    </div>
  );
}
