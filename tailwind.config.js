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
            primary: "#1F5D7A",
            gold: "#D4AF37",
            bg: "#F7FAFC",
          },
        },
      },
    },
    plugins: [],
  };
  