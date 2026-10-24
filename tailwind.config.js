import { createRequire } from 'module';
import { createRequire } from 'module';

var require = createRequire(import.meta.url);
var module = { exports: {} };

const require = createRequire(import.meta.url);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Dark mode is opt-in via a `dark` class on <html> (toggled by ThemeContext).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand green — Pianat palette
        brand: {
          50:  '#E1F5EE',  // tint fill / badge bg
          100: '#9FE1CB',  // muted accent
          400: '#5DCAA5',  // accent text / soft highlight
          500: '#1D9E75',  // primary action
          600: '#0F6E56',  // hover state
          700: '#0a5040',  // active / pressed
          800: '#0F2E22',  // dark text strong (light mode)
          900: '#2A5C4A',  // text body (light mode)
        },
      },
    },
  },
  // Bootstrap is also loaded (for .form-control/.btn/.spinner-border used by
  // the ported pages). Disable Tailwind's preflight so it doesn't fight
  // Bootstrap's reset.
  corePlugins: { preflight: false },
  plugins: [],
};
;
