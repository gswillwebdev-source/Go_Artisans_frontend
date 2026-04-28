'use client';

export default function Modal({
    isOpen,
    title,
    message,
    type = 'info', // 'info', 'success', 'error', 'warning', 'confirm'
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    children
}) {
    if (!isOpen) return null;

    // Determine colors and icon based on type
    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    titleColor: 'text-green-900',
                    messageColor: 'text-green-700',
                    iconBg: 'bg-green-100',
                    iconColor: 'text-green-600',
                    buttonColor: 'bg-green-600 hover:bg-green-700',
                    icon: '✓'
                };
            case 'error':
                return {
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    titleColor: 'text-red-900',
                    messageColor: 'text-red-700',
                    iconBg: 'bg-red-100',
                    iconColor: 'text-red-600',
                    buttonColor: 'bg-red-600 hover:bg-red-700',
                    icon: '✕'
                };
            case 'warning':
                return {
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    titleColor: 'text-yellow-900',
                    messageColor: 'text-yellow-700',
                    iconBg: 'bg-yellow-100',
                    iconColor: 'text-yellow-600',
                    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
                    icon: '⚠'
                };
            case 'confirm':
                return {
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    titleColor: 'text-blue-900',
                    messageColor: 'text-blue-700',
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                    buttonColor: 'bg-blue-600 hover:bg-blue-700',
                    icon: '?'
                };
            default:
                return {
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    titleColor: 'text-blue-900',
                    messageColor: 'text-blue-700',
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                    buttonColor: 'bg-blue-600 hover:bg-blue-700',
                    icon: 'ℹ'
                };
        }
    };

    const styles = getStyles();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${styles.bgColor} border ${styles.borderColor} rounded-lg shadow-xl p-8 max-w-md w-full mx-4`}>
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 ${styles.iconBg} rounded-full flex items-center justify-center`}>
                        <span className={`text-3xl font-bold ${styles.iconColor}`}>
                            {styles.icon}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h2 className={`text-2xl font-bold ${styles.titleColor} text-center mb-2`}>
                    {title}
                </h2>

                {/* Message */}
                {message && (
                    <p className={`${styles.messageColor} text-center mb-6`}>
                        {message}
                    </p>
                )}

                {/* Custom Content */}
                {children && (
                    <div className="mb-6">
                        {children}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {cancelText}
                        </button>
                    )}
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-3 ${styles.buttonColor} text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition`}
                        >
                            {isLoading ? 'Processing...' : confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
