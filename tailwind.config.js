/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/app/**/*.{js,ts,jsx,tsx}",
      "./src/components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          brand: {
            // From the Starks logo (blue ring + gold trim)
            primary: "#1B6A8F",
            deep: "#0F4F6C",
            gold: "#D4AF37",
            bg: "#F7FAFC",
          },
        },
        backgroundImage: {
          "stadium-glow":
            "radial-gradient(80% 60% at 50% 0%, rgba(212,175,55,0.35) 0%, rgba(212,175,55,0) 55%), radial-gradient(60% 60% at 0% 20%, rgba(27,106,143,0.22) 0%, rgba(27,106,143,0) 60%), radial-gradient(60% 60% at 100% 30%, rgba(15,79,108,0.22) 0%, rgba(15,79,108,0) 60%)",
          "pitch-lines":
            "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
        },
        backgroundSize: {
          "pitch-lines": "28px 28px",
        },
        keyframes: {
          "pulse-soft": {
            "0%, 100%": { opacity: "0.55" },
            "50%": { opacity: "0.9" },
          },
        },
        animation: {
          "pulse-soft": "pulse-soft 6s ease-in-out infinite",
        },
      },
    },
    plugins: [],
  };
  