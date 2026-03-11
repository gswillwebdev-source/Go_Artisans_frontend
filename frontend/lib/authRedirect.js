const DEFAULT_SITE_URL = 'https://goartisans.online'

function normalizeUrl(value) {
    return (value || '').replace(/\/$/, '')
}

function isLocalUrl(value) {
    try {
        const parsed = new URL(value)
        return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    } catch {
        return false
    }
}

function getPreferredBaseUrl() {
    const configuredSiteUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL)
    if (configuredSiteUrl && !isLocalUrl(configuredSiteUrl)) {
        return configuredSiteUrl
    }

    if (typeof window !== 'undefined') {
        const currentOrigin = normalizeUrl(window.location.origin)
        if (currentOrigin && !isLocalUrl(currentOrigin)) {
            return currentOrigin
        }
    }

    return DEFAULT_SITE_URL
}

export function getAuthSuccessRedirectUrl() {
    return `${getPreferredBaseUrl()}/auth-success`
}

export function getResetPasswordRedirectUrl() {
    return `${getPreferredBaseUrl()}/reset-password`
}
