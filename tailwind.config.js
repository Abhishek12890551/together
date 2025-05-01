/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        plusJakarta: ["PlusJakartaSans-Regular", "sans-serif"],
        plusJakartaBold: ["PlusJakartaSans-Bold", "sans-serif"],
        plusJakartaMedium: ["PlusJakartaSans-Medium", "sans-serif"],
        plusJakartaItalic: ["PlusJakartaSans-Italic", "sans-serif"],
        plusJakartaLight: ["PlusJakartaSans-Light", "sans-serif"],
        ubuntu: ["Ubuntu-Regular", "sans-serif"],
        ubuntuBold: ["Ubuntu-Bold", "sans-serif"],
        ubuntuLight: ["Ubuntu-Light", "sans-serif"],
        ubuntuMedium: ["Ubuntu-Medium", "sans-serif"],
        ubuntuItalic: ["Ubuntu-Italic", "sans-serif"],
        urbanist: ["Urbanist-Regular", "sans-serif"],
        urbanistBold: ["Urbanist-Bold", "sans-serif"],
        urbanistLight: ["Urbanist-Light", "sans-serif"],
        urbanistMedium: ["Urbanist-Medium", "sans-serif"],
        urbanistItalic: ["Urbanist-Italic", "sans-serif"],
        moonDance: ["MoonDance-Regular", "serif"],
      },
    },
  },
  plugins: [],
};
