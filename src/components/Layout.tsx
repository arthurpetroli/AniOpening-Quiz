import { Home, RadioTower } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07080b]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-3 font-semibold text-white">
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-amber-300/30 bg-amber-300/10 text-amber-200 shadow-[inset_0_0_22px_rgba(251,191,36,0.08)]">
              <RadioTower size={20} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm uppercase text-zinc-400">AniOpening</span>
              <span className="block -mt-1 text-base">Quiz</span>
            </span>
          </NavLink>

          <NavLink
            to="/"
            className={({ isActive }) =>
              [
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition",
                isActive
                  ? "border-amber-300/50 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 hover:bg-white/10",
              ].join(" ")
            }
          >
            <Home size={16} aria-hidden="true" />
            Home
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:py-9">
        <Outlet />
      </main>
    </div>
  );
}
