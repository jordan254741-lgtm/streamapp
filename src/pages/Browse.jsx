export default function Browse({ user }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Browse Movies</h1>
      <p className="text-gray-500">Welcome back! Movie catalogue coming in Phase 2.</p>
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg inline-block">
        <p className="text-green-700 font-medium">✓ Phase 1 complete — Auth is working</p>
        <p className="text-green-600 text-sm mt-1">Logged in as: {user?.email}</p>
      </div>
    </div>
  )
}

