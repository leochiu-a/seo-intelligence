/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // project tokens
        pink: 'var(--color-pink)',
        dark: 'var(--color-dark)',
        ink: 'var(--color-ink)',
        secondary: 'var(--color-secondary)',
        'muted-fg': 'var(--color-muted-fg)',
        placeholder: 'var(--color-placeholder)',
        border: 'var(--color-border)',
        disabled: 'var(--color-disabled)',
        surface: 'var(--color-surface)',
        canvas: 'var(--color-canvas)',
        'tier-high': 'var(--color-tier-high)',
        'tier-mid': 'var(--color-tier-mid)',
        'tier-low': 'var(--color-tier-low)',
        'tier-neutral': 'var(--color-tier-neutral)',
        // shadcn semantic tokens
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        destructive: 'var(--destructive)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
