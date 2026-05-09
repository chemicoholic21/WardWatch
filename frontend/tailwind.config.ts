import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme inspired by observability platforms
        background: 'hsl(222, 47%, 7%)',
        foreground: 'hsl(210, 40%, 96%)',
        card: {
          DEFAULT: 'hsl(222, 47%, 10%)',
          foreground: 'hsl(210, 40%, 96%)',
        },
        popover: {
          DEFAULT: 'hsl(222, 47%, 10%)',
          foreground: 'hsl(210, 40%, 96%)',
        },
        primary: {
          DEFAULT: 'hsl(217, 91%, 60%)',
          foreground: 'hsl(222, 47%, 7%)',
        },
        secondary: {
          DEFAULT: 'hsl(215, 20%, 20%)',
          foreground: 'hsl(210, 40%, 96%)',
        },
        muted: {
          DEFAULT: 'hsl(215, 20%, 15%)',
          foreground: 'hsl(215, 20%, 65%)',
        },
        accent: {
          DEFAULT: 'hsl(215, 20%, 20%)',
          foreground: 'hsl(210, 40%, 96%)',
        },
        destructive: {
          DEFAULT: 'hsl(0, 84%, 60%)',
          foreground: 'hsl(210, 40%, 96%)',
        },
        // Alert colors
        alert: {
          critical: 'hsl(0, 84%, 60%)',
          high: 'hsl(25, 95%, 53%)',
          medium: 'hsl(45, 93%, 47%)',
          low: 'hsl(142, 71%, 45%)',
        },
        border: 'hsl(215, 20%, 20%)',
        input: 'hsl(215, 20%, 20%)',
        ring: 'hsl(217, 91%, 60%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
