// GoArtisans Design System
export const Colors = {
    // Brand
    primary: '#f97316',
    primaryDark: '#ea580c',
    primaryLight: '#fb923c',
    primaryGlow: '#f9731620',

    // Backgrounds
    bg: '#0f172a',
    bgCard: '#1e293b',
    bgCardAlt: '#162032',
    bgElevated: '#253247',

    // Borders
    border: '#334155',
    borderLight: '#475569',

    // Text
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textDisabled: '#475569',

    // Status
    success: '#22c55e',
    successGlow: '#22c55e20',
    error: '#ef4444',
    errorGlow: '#ef444420',
    warning: '#f59e0b',
    warningGlow: '#f59e0b20',
    info: '#3b82f6',
    infoGlow: '#3b82f620',

    // Plans
    free: '#6b7280',
    pro: '#f59e0b',
    proGlow: '#f59e0b20',
    premium: '#a855f7',
    premiumGlow: '#a855f720',

    // Pure
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
};

export const Typography = {
    h1: { fontSize: 28, fontWeight: '800' as const, color: Colors.textPrimary, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary },
    h3: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary },
    h4: { fontSize: 16, fontWeight: '600' as const, color: Colors.textPrimary },
    body: { fontSize: 14, fontWeight: '400' as const, color: Colors.textSecondary, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400' as const, color: Colors.textMuted },
    label: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
    badge: { fontSize: 11, fontWeight: '700' as const },
};

export const Shadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#f97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
};
