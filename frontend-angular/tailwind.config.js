/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                // Dark theme color palette
                primary: {
                    50: 'rgba(99, 102, 241, 0.05)',
                    100: 'rgba(99, 102, 241, 0.1)',
                    200: 'rgba(99, 102, 241, 0.2)',
                    300: 'rgba(99, 102, 241, 0.3)',
                    400: '#818CF8',
                    500: '#6366F1',
                    600: '#4F46E5',
                    700: '#4338CA',
                    800: '#3730A3',
                    900: '#312E81',
                    950: '#1E1B4B',
                },
                // Dark backgrounds
                dark: {
                    50: '#1E293B',
                    100: '#1E293B',
                    200: '#1E293B',
                    300: '#334155',
                    400: '#475569',
                    500: '#64748B',
                    600: '#94A3B8',
                    700: '#CBD5E1',
                    800: '#E2E8F0',
                    900: '#F1F5F9',
                    950: '#F8FAFC',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' },
                    '50%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' },
                },
            },
            boxShadow: {
                'card': '0 4px 12px rgba(0, 0, 0, 0.4)',
                'card-hover': '0 8px 24px rgba(0, 0, 0, 0.5)',
                'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-lg': '0 0 30px rgba(99, 102, 241, 0.4)',
            },
            backdropBlur: {
                'xs': '2px',
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '20px',
            },
        },
    },
    plugins: [],
}
