export default function Queue() {
  const activities = [
    { id: 1, title: "Basketball 3v3", location: "Riverside Court", time: "Today 5PM", spots: 2, emoji: "🏀" },
    { id: 2, title: "Coffee & Chill", location: "Blue Bottle Coffee", time: "Today 3PM", spots: 4, emoji: "☕" },
    { id: 3, title: "Sunset Hike", location: "Runyon Canyon", time: "Sat 6AM", spots: 3, emoji: "🥾" },
    { id: 4, title: "FIFA Tournament", location: "Game Zone", time: "Fri 7PM", spots: 1, emoji: "🎮" },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-3xl font-bold text-blue-500 mb-2">Find Your Squad</h1>
      <p className="text-gray-400 mb-8">Activities happening near you</p>

      <div className="flex flex-col gap-4">
        {activities.map((activity) => (
          <div key={activity.id} className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{activity.emoji}</span>
              <div>
                <h2 className="font-bold text-lg">{activity.title}</h2>
                <p className="text-gray-400 text-sm">{activity.location}</p>
                <p className="text-gray-500 text-sm">{activity.time}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-blue-700 text-white text-xs px-3 py-1 rounded-full">
                {activity.spots} spots left
              </span>
              <button className="block mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                Join
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}