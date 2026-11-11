import { Outlet } from "react-router-dom";
import Navbar from './navbar/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
        <Navbar />
        <main className="mt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
