/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Roboto Mono', 'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        roboto: ['Roboto', 'sans-serif'],
      },
      colors: {
        radar: {
          bg: '#0a0d14',
          card: '#111726',
          cardHover: '#161f33',
          border: '#1e293b',
          borderGlow: '#334155',
          hotspot: {
            DEFAULT: '#ef4444',
            glow: '#f43f5e',
            bg: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.4)'
          },
          important: {
            DEFAULT: '#f59e0b',
            glow: '#fbbf24',
            bg: 'rgba(245, 158, 11, 0.12)',
            border: 'rgba(245, 158, 11, 0.4)'
          },
          normal: {
            DEFAULT: '#38bdf8',
            glow: '#60a5fa',
            bg: 'rgba(56, 189, 248, 0.08)',
            border: 'rgba(56, 189, 248, 0.3)'
          },
          low: {
            DEFAULT: '#64748b',
            glow: '#94a3b8',
            bg: 'rgba(100, 116, 139, 0.08)',
            border: 'rgba(100, 116, 139, 0.2)'
          }
        }
      },
      boxShadow: {
        'hotspot-glow': '0 0 20px -2px rgba(239, 68, 68, 0.4), 0 0 8px rgba(244, 63, 94, 0.3)',
        'important-glow': '0 0 16px -2px rgba(245, 158, 11, 0.3), 0 0 6px rgba(251, 191, 36, 0.2)',
        'radar-glow': '0 0 25px -3px rgba(56, 189, 248, 0.25)',
        'orange-glow': '0 0 20px -2px rgba(249, 115, 22, 0.35), 0 0 8px rgba(249, 115, 22, 0.2)',
        'blue-glow': '0 0 20px -2px rgba(59, 130, 246, 0.35), 0 0 8px rgba(59, 130, 246, 0.2)',
        'card-lift': '0 10px 30px -10px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card-lift-dark': '0 12px 35px -10px rgba(0, 0, 0, 0.5), 0 0 15px rgba(249, 115, 22, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'sweep 4s linear infinite',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-scale': 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in-spring': 'scaleInSpring 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-bottom': 'slideInBottom 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleInSpring: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInBottom: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.03)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      }
    },
  },
  plugins: [],
}
