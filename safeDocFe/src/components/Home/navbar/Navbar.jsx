import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "../../ThemeToggle";

function Navbar() {
  const location = useLocation();

  const navLinks = [
    { to: "/provider", label: "Provider" },
    { to: "/reciepient", label: "Recipient" },
    { to: "/viewer", label: "Viewer" },
    { to: "/admin", label: "Admin" },
    { to: "/audit", label: "Audit & Custody", highlight: true },
  ];

  const isActive = (path) => {
    if (path === "/provider" && (location.pathname === "/" || location.pathname === "/provider")) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="relative flex w-full items-center justify-between bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs mb-4 transition-colors">
      <div className="flex w-full items-center justify-between gap-4">
        {/* Brand / Title */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold tracking-tight text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span className="hidden sm:inline">DocSafe</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800/60 hidden md:inline">
              Evidence Chain
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? link.highlight
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                    : link.highlight
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: Theme Switcher */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
