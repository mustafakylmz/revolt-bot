// client/src/App.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './index.css'; // Tailwind CSS'i dahil etmek için

// Auth Context
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    const userId = params.get('user_id');
    const username = params.get('username');

    if (token && userId && username) {
      localStorage.setItem('discord_access_token', token);
      localStorage.setItem('discord_user_id', userId);
      localStorage.setItem('discord_username', username);
      setUser({ id: userId, username: username });
      setAccessToken(token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem('discord_access_token');
      const storedUserId = localStorage.getItem('discord_user_id');
      const storedUsername = localStorage.getItem('discord_username');
      if (storedToken && storedUserId && storedUsername) {
        setAccessToken(storedToken);
        setUser({ id: storedUserId, username: storedUsername });
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('discord_access_token');
    localStorage.removeItem('discord_user_id');
    localStorage.removeItem('discord_username');
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Discord Bot Yönetim Paneli</h1>
        <p className="text-gray-300 mb-8">Discord hesabınızla giriş yaparak bot ayarlarınızı yönetin.</p>
        <a
          href="/auth/discord"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 ease-in-out flex items-center justify-center space-x-2"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.522 3.094a1.865 1.865 0 00-1.705-.724c-1.396.388-2.736.85-4.04 1.34-1.258.46-2.48.95-3.665 1.458-.87.37-1.72.76-2.544 1.16a1.866 1.866 0 00-1.666.864c-.496.67-.93 1.378-1.296 2.11-.34.68-.61 1.38-.81 2.106-.18.66-.29 1.34-.33 2.03-.04.68-.02 1.37.06 2.05.08.68.22 1.35.42 2.01.21.65.48 1.28.81 1.89.34.61.73 1.19 1.18 1.74.45.55.95 1.07 1.5 1.57.56.5 1.16.97 1.8 1.41.65.44 1.34.86 2.06 1.25.72.39 1.48.76 2.27 1.1a1.866 1.866 0 001.76.01c.78-.36 1.54-.75 2.27-1.16.73-.4 1.42-.83 2.06-1.29.65-.46 1.25-.94 1.8-1.42.56-.49 1.06-1.02 1.5-1.57.45-.55.84-1.13 1.18-1.74.34-.61.61-1.24.81-1.89.21-.66.35-1.33.42-2.01.08-.68.1-1.37.06-2.05-.04-.69-.15-1.37-.33-2.03-.2-1.27-.6-2.5-1.18-3.66-.58-1.16-1.28-2.28-2.08-3.34a1.866 1.866 0 00-1.666-.864c-.824-.4-1.674-.79-2.544-1.16-1.185-.508-2.407-1.002-3.665-1.458-1.304-.49-2.644-.952-4.04-1.34a1.865 1.865 0 00-1.705.724z" />
          </svg>
          <span>Discord ile Giriş Yap</span>
        </a>
      </div>
    </div>
  );
};

// Guild List Component
const GuildList = ({ onSelectGuild }) => {
  const { accessToken, logout } = useContext(AuthContext);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const response = await axios.get('/api/guilds', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        setGuilds(response.data);
      } catch (err) {
        console.error('Sunucular alınırken hata:', err);
        setError('Sunucular alınırken bir hata oluştu. Lütfen tekrar deneyin veya giriş yapın.');
        if (err.response && err.response.status === 401) {
          logout(); // Token expired or invalid
        }
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchGuilds();
    }
  }, [accessToken, logout]);

  if (loading) {
    return <div className="text-center text-white">Sunucular yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Botunuzun Bulunduğu Sunucular</h2>
      <p className="text-gray-300 mb-4">Lütfen ayarlarını yapmak istediğiniz bir sunucu seçin.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guilds.length > 0 ? (
          guilds.map(guild => (
            <button
              key={guild.id}
              onClick={() => onSelectGuild(guild)}
              className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg flex items-center space-x-4 transition duration-200 ease-in-out"
            >
              {guild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
                  alt={`${guild.name} icon`}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white text-lg font-bold">
                  {guild.name.charAt(0)}
                </div>
              )}
              <span className="text-white text-lg font-semibold">{guild.name}</span>
            </button>
          ))
        ) : (
          <p className="text-gray-400 col-span-full">Botunuzun yönetebileceği bir sunucu bulunamadı. Botu sunucularınıza eklediğinizden ve yönetici yetkisine sahip olduğunuzdan emin olun.</p>
        )}
      </div>
      <button
        onClick={logout}
        className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
      >
        Çıkış Yap
      </button>
    </div>
  );
};

// Configuration Panel Component (Placeholder)
const ConfigPanel = ({ guild, onBack }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`/api/guilds/${guild.id}/config`);
        setConfig(response.data);
      } catch (err) {
        console.error('Yapılandırma alınırken hata:', err);
        setError('Yapılandırma alınırken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [guild.id]);

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      await axios.post(`/api/guilds/${guild.id}/config`, config);
      alert('Yapılandırma başarıyla kaydedildi!');
    } catch (err) {
      console.error('Yapılandırma kaydedilirken hata:', err);
      alert('Yapılandırma kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-white">Yapılandırma yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
      <button onClick={onBack} className="mb-4 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-full">
        &larr; Sunuculara Geri Dön
      </button>
      <h2 className="text-2xl font-bold text-white mb-4">{guild.name} Ayarları</h2>
      <p className="text-gray-300 mb-4">Burada botunuzun ayarlarını yönetebilirsiniz.</p>

      {/* Example: Displaying configurableRoleIds (read-only for now) */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Yapılandırılabilir Roller</h3>
        {config.configurableRoleIds && config.configurableRoleIds.length > 0 ? (
          <ul className="list-disc list-inside text-gray-300">
            {config.configurableRoleIds.map(roleId => (
              <li key={roleId}>{roleId}</li> // Ideally, fetch role names here
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Henüz yapılandırılabilir rol yok.</p>
        )}
      </div>

      {/* Example: Displaying Faceit Level Roles (read-only for now) */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Faceit Seviye Rolleri</h3>
        {config.faceitLevelRoles && Object.keys(config.faceitLevelRoles).length > 0 ? (
          <ul className="list-disc list-inside text-gray-300">
            {Object.entries(config.faceitLevelRoles).map(([level, roleId]) => (
              <li key={level}>Level {level}: {roleId}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Henüz Faceit seviye rolü tanımlanmadı.</p>
        )}
      </div>

      {/* Example: Displaying Role Panel Info (read-only for now) */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Rol Paneli Bilgisi</h3>
        <p className="text-gray-300">Kanal ID: {config.rolePanelChannelId || 'Tanımlı Değil'}</p>
        <p className="text-gray-300">Mesaj ID: {config.rolePanelMessageId || 'Tanımlı Değil'}</p>
      </div>

      {/* Save Button (will be functional later) */}
      <button
        onClick={handleSaveConfig}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out"
      >
        Ayarları Kaydet (Şu an için sadece gösterim)
      </button>
    </div>
  );
};

// Main App Component
const App = () => {
  const { user, loading } = useContext(AuthContext);
  const [selectedGuild, setSelectedGuild] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-xl">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
      <div className="container mx-auto max-w-4xl">
        {!user ? (
          <Login />
        ) : (
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-center">Hoş Geldiniz, {user.username}!</h1>
            {!selectedGuild ? (
              <GuildList onSelectGuild={setSelectedGuild} />
            ) : (
              <ConfigPanel guild={selectedGuild} onBack={() => setSelectedGuild(null)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Root Component
const Root = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default Root; // Export Root as default
