/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Dark mode is opt-in via a `dark` class on <html> (toggled by ThemeContext).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand green (matches the Comply.now logo mark). Used to unify buttons.
        brand: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
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
