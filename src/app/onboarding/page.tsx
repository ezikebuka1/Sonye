export default function Onboarding() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      
      {/* Logo */}
      <h1 className="text-5xl font-bold text-blue-500 mb-4">SquadUp</h1>
      <p className="text-gray-400 text-center mb-12">
        Find your squad. Join local activities together.
      </p>

      {/* Fake user avatars */}
      <div className="flex -space-x-4 mb-12">
        {["A", "B", "C", "D"].map((letter) => (
          <div key={letter} className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center font-bold border-2 border-black">
            {letter}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <button className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl mb-4">
        Get Started
      </button>
      <button className="w-full max-w-sm border border-gray-600 text-gray-300 font-semibold py-4 rounded-2xl">
        I already have an account
      </button>

    </main>
  );
}