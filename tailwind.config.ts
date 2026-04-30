import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        revolt: {
          dark: '#0f0f0f',
          darker: '#0a0a0a',
          card: '#141414',
          border: '#2a2a2a',
          muted: '#3a3a3a',
          text: '#ffffff',
          textMuted: '#a0a0a0',
          accent: '#FF4655',
          accentHover: '#FF6B7A',
          green: '#57F287',
          yellow: '#FEE75C',
          red: '#FF4655',
          blue: '#5865F2',
        },
        brand: {
          red: '#FF4655',
          dark: '#0f0f0f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
