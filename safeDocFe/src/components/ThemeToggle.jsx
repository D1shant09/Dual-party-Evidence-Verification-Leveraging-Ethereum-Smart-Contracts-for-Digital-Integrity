import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme switcher"
      className={`inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 transition-colors ${className}`}
    >
      {/* Light Option */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Light theme"
        aria-label="Switch to light theme"
        aria-pressed={theme === 'light'}
        className={`relative flex items-center justify-center p-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          theme === 'light'
            ? 'bg-white text-amber-500 shadow-xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-amber-400'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <span className="sr-only">Light</span>
      </button>

      {/* Dark Option */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Dark theme"
        aria-label="Switch to dark theme"
        aria-pressed={theme === 'dark'}
        className={`relative flex items-center justify-center p-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          theme === 'dark'
            ? 'bg-white text-indigo-500 shadow-xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <span className="sr-only">Dark</span>
      </button>

      {/* System Option */}
      <button
        type="button"
        onClick={() => setTheme('system')}
        title={`System theme (${resolvedTheme === 'dark' ? 'currently dark' : 'currently light'})`}
        aria-label="Switch to system theme"
        aria-pressed={theme === 'system'}
        className={`relative flex items-center justify-center p-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          theme === 'system'
            ? 'bg-white text-slate-800 shadow-xs ring-1 ring-black/5 dark:bg-slate-700 dark:text-slate-100'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
        <span className="sr-only">System</span>
      </button>
    </div>
  );
}
