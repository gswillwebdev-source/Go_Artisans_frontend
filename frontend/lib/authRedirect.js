export function getAuthSuccessRedirectUrl() {
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
    const normalizedConfiguredUrl = configuredSiteUrl ? configuredSiteUrl.replace(/\/$/, '') : ''

    if (normalizedConfiguredUrl) {
        return `${normalizedConfiguredUrl}/auth-success`
    }

    if (typeof window !== 'undefined') {
        return `${window.location.origin}/auth-success`
    }

    return 'https://goartisans.online/auth-success'
}
