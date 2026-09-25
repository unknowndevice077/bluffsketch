import type { Config } from 'tailwindcss';

/** Every colour is a CSS variable (see src/index.css) so dark mode is a class swap. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        'paper-line': token('paper-line'),
        card: token('card'),
        ink: token('ink'),
        muted: token('muted'),
        accent: token('accent'),
        sun: token('sun'),
        sky: token('sky'),
        mint: token('mint'),
        grape: token('grape'),
        danger: token('danger'),
      },
      fontFamily: {
        display: ['"Caveat Brush"', '"Patrick Hand"', 'cursive'],
        hand: ['"Patrick Hand"', 'cursive'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sketch: '4px 4px 0 0 rgb(var(--ink) / 1)',
        'sketch-sm': '2px 2px 0 0 rgb(var(--ink) / 1)',
        'sketch-lg': '7px 7px 0 0 rgb(var(--ink) / 1)',
      },
      borderRadius: {
        // Uneven radii read as a hand-drawn outline.
        wobble: '255px 18px 225px 18px / 18px 225px 18px 255px',
        'wobble-sm': '30px 8px 26px 8px / 8px 26px 8px 30px',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        drawing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.35)', opacity: '0.55' },
        },
      },
      animation: {
        wiggle: 'wiggle 2.4s ease-in-out infinite',
        floaty: 'floaty 3s ease-in-out infinite',
        drawing: 'drawing 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
