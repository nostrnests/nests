/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-1": "var(--gradient-1)",
        "gradient-2": "var(--gradient-2)",
        "gradient-3": "var(--gradient-3)",
        "gradient-4": "var(--gradient-4)",
        "gradient-5": "var(--gradient-5)",
        "gradient-6": "var(--gradient-6)",
        "gradient-7": "var(--gradient-7)",
        "gradient-8": "var(--gradient-8)",
        "gradient-9": "var(--gradient-9)",
        "gradient-10": "var(--gradient-10)",
        "gradient-11": "var(--gradient-11)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "foreground-2": "var(--foreground-2)",
        "foreground-2-hover": "var(--foreground-2-hover)",
        primary: "var(--primary)",
        highlight: "var(--highlight)",
        delete: "var(--delete)",
        bitcoin: "var(--bitcoin)",
        "primary-1": "var(--primary-1)",
        "primary-2": "var(--primary-2)",
        "primary-3": "var(--primary-3)",
        "primary-4": "var(--primary-4)",
        "primary-5": "var(--primary-5)",
        "primary-6": "var(--primary-6)",
        "primary-7": "var(--primary-7)",
        "primary-8": "var(--primary-8)",
      },
    },
  },
  safelist: [
    {
      pattern: /bg-gradient-[\d]+/i,
    },
    {
      pattern: /(text|bg)-primary-[\d]+/i,
    },
  ],
  plugins: [],
};
