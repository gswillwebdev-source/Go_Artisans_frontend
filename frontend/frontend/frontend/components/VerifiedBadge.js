/**
 * VerifiedBadge — Twitter/X-style blue circle with white checkmark
 * Usage: <VerifiedBadge size={20} />
 */
export default function VerifiedBadge({ size = 20, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="Verified"
        >
            {/* Solid blue circle */}
            <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
            {/* White checkmark */}
            <path
                d="M7.5 12.5 L10.5 15.5 L16.5 9"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
