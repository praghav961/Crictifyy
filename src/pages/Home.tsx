import { useAuth } from '../contexts/AuthContext';
import { Activity, Trophy, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 sm:p-12 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
            Professional Cricket <br className="hidden sm:block"/>
            <span className="text-emerald-600 dark:text-emerald-500">Tournament Management</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
            Crictify is your all-in-one platform for live scoring, tournament hosting, and advanced cricket analytics. Experience the game like never before.
          </p>
          {!user && (
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/register" 
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Get Started
              </Link>
              <Link 
                to="/matches" 
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                View Live Matches
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Live Scoring</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ball-by-ball updates, comprehensive statistics, and real-time synchronization for global viewers.
          </p>
          <Link to="/matches" className="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
            View matches <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tournaments</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Host and manage leagues, generate points tables, leaderboards, and manage sponsors effectively.
          </p>
          <Link to="/tournaments" className="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
            Explore tournaments <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Teams & Players</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Detailed player profiles, career statistics, team management, and secure roles.
          </p>
          <Link to="/teams" className="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
            Browse teams <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}
