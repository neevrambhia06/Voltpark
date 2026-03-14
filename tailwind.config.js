
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0f172a", // Midnight blue / dark slate
                secondary: "#14b8a6", // Teal
                accent: "#f59e0b", // Amber for highlights
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                ferron: ['Ferron', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
