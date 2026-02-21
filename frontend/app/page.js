export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Find Your Next Opportunity</h2>
          <p className="text-lg text-gray-600 mb-8">Discover thousands of job listings and connect with top employers</p>
          <a href="/jobs" className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 text-lg font-semibold">
            Explore Jobs
          </a>
        </div>
      </div>
    </main>
  )
}
