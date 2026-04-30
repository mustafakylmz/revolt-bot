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
          accent: '#5865F2',
          accentHover: '#4752C4',
          green: '#57F287',
          yellow: '#FEE75C',
          red: '#ED4245',
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
