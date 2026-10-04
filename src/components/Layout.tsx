import { NavLink, Outlet } from 'react-router-dom';
import { useSpeechSupport } from '../hooks/useSpeechSupport';
import { useProgress } from '../store/progress';

const tabs = [
  { to: '/', label: 'Trang chủ', icon: '🏠' },
  { to: '/learn', label: 'Học', icon: '📖' },
  { to: '/unknown', label: 'Chưa biết', icon: '📌' },
  { to: '/practice', label: 'Luyện', icon: '✏️' },
  { to: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

export default function Layout() {
  const supported = useSpeechSupport();
  const storageError = useProgress((s) => s.storageError);
  const clearStorageError = useProgress((s) => s.clearStorageError);
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header
        className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            english<span className="text-indigo-600">_nxt</span>
          </NavLink>
          <nav className="hidden gap-4 text-sm sm:flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-indigo-600' : 'text-slate-600'
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {!supported && (
        <div
          className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800"
        >
          Trình duyệt này chưa hỗ trợ phát âm — dùng Chrome hoặc Edge để nghe audio.
        </div>
      )}

      {storageError && (
        <div
          className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-center text-sm text-amber-800"
          role="alert"
        >
          <span>Không lưu được tiến độ — kiểm tra bộ nhớ trình duyệt</span>
          <button
            type="button"
            onClick={clearStorageError}
            aria-label="Đóng cảnh báo"
            className="font-bold hover:text-amber-950"
          >
            ×
          </button>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden"
      >
        <div className="grid grid-cols-5">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? 'font-semibold text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}