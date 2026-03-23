'use client'

export default function FollowStats({ followerCount = 0, followingCount = 0, isOwnProfile = false }) {
  return (
    <div className="flex gap-8 py-4 border-b border-gray-200">
      <div className="flex flex-col items-center">
        <p className="text-2xl font-bold text-indigo-600">{followerCount}</p>
        <p className="text-sm text-gray-600">
          {followerCount === 1 ? 'Follower' : 'Followers'}
        </p>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-2xl font-bold text-indigo-600">{followingCount}</p>
        <p className="text-sm text-gray-600">
          {followingCount === 1 ? 'Following' : 'Following'}
        </p>
      </div>

      {isOwnProfile && (
        <div className="flex items-center text-xs text-gray-500">
          <span>👤 {followerCount} can see your profile</span>
        </div>
      )}
    </div>
  )
}
