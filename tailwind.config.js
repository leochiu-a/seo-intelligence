/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: 'var(--color-dark)',
        'muted-fg': 'var(--color-muted-fg)',
        placeholder: 'var(--color-placeholder)',
        'tier-high': 'var(--color-tier-high)',
        'tier-mid': 'var(--color-tier-mid)',
        'tier-low': 'var(--color-tier-low)',
        'tier-neutral': 'var(--color-tier-neutral)',
      },
    },
  },
  plugins: [],
}

