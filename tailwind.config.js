/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ganti warna Primary di sini
        primary: {
          DEFAULT: '#0D9488', // Teal-600 (Warna Utama)
          dark: '#0F766E',    // Teal-700 (Saat di-hover)
          light: '#CCFBF1',   // Teal-100 (Untuk background kartu/badge)
        },
        // Warna latar belakang aplikasi (jangan putih murni #FFFFFF, sakit mata)
        background: '#F8FAFC', // Slate-50
        
        // Warna teks (jangan hitam murni #000000, terlalu kontras)
        textMain: '#1E293B',   // Slate-800
        textMuted: '#64748B',  // Slate-500
      }
    },
  },
  plugins: [],
}