'use client'

export default function UserCardSkeleton() {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
            {/* Profile Picture */}
            <div className="h-48 bg-gray-200"></div>

            {/* Card Content */}
            <div className="p-4 space-y-3">
                {/* Badge */}
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>

                {/* Follow Button */}
                <div className="h-10 w-full bg-gray-200 rounded-lg"></div>

                {/* Name */}
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>

                {/* Job Title */}
                <div className="h-3 w-1/2 bg-gray-200 rounded"></div>

                {/* Bio */}
                <div className="space-y-2">
                    <div className="h-3 w-full bg-gray-200 rounded"></div>
                    <div className="h-3 w-4/5 bg-gray-200 rounded"></div>
                </div>

                {/* Location */}
                <div className="h-3 w-2/3 bg-gray-200 rounded"></div>

                {/* Profile Link */}
                <div className="h-4 w-1/3 bg-gray-200 rounded mt-3"></div>
            </div>
        </div>
    )
}
