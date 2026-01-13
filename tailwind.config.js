/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AppColors from DesignSystem.swift
        background: '#0A0A0F', // deepBlack
        surface: '#1A0B2E',    // darkPurple
        surfaceHighlight: '#2D1B4E', // midPurple
        
        primary: '#00F5FF',    // neonCyan
        secondary: '#FF006E',  // neonPink
        accent: '#7209B7',     // synthPurple
        
        text: {
          primary: '#FFFFFF',
          secondary: '#B8B8D1',
          muted: '#6E6E8F',
        },
        
        grid: {
          line: '#1F1F3D',
          glow: 'rgba(255, 0, 110, 0.4)',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.3)',
        'glow-pink': '0 0 20px rgba(255, 0, 110, 0.3)',
        'neon-border': '0 0 0 1px rgba(0, 245, 255, 0.5), 0 0 15px rgba(0, 245, 255, 0.2)',
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(to bottom right, #0A0A0F, #1A0B2E, #0A0A0F)',
      }
    },
  },
  plugins: [],
}