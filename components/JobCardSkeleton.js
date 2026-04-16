'use client'

export default function JobCardSkeleton() {
    return (
        <div className="glass-surface rounded-2xl overflow-hidden animate-pulse">
            <div className="p-6 space-y-4">
                {/* Job Title */}
                <div className="h-6 w-3/4 bg-gray-300 rounded"></div>

                {/* Budget */}
                <div className="flex justify-between items-center">
                    <div className="h-5 w-1/2 bg-gray-300 rounded"></div>
                    <div className="h-5 w-20 bg-gray-300 rounded"></div>
                </div>

                {/* Description Lines */}
                <div className="space-y-2 pt-2">
                    <div className="h-4 w-full bg-gray-300 rounded"></div>
                    <div className="h-4 w-5/6 bg-gray-300 rounded"></div>
                </div>

                {/* Location and Category */}
                <div className="flex gap-3 pt-2">
                    <div className="h-4 w-24 bg-gray-300 rounded-full"></div>
                    <div className="h-4 w-24 bg-gray-300 rounded-full"></div>
                </div>

                {/* Client Info */}
                <div className="h-4 w-2/3 bg-gray-300 rounded pt-2"></div>

                {/* Button */}
                <div className="h-10 w-full bg-gray-300 rounded-lg mt-4"></div>
            </div>
        </div>
    )
}
