import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/courses", label: "Courses" },
    { to: "/chats", label: "Chats" },
    { to: "/quizzes", label: "Quizzes" },
    { to: "/flashcards", label: "Flashcards" },
    { to: "/progress", label: "Progress" },
    { to: "/study-planner", label: "Study planner" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="border-b border-paper-300 bg-paper-50/80 backdrop-blur">
      <div className="flex items-center gap-6 overflow-x-auto px-6 py-3">
        <span className="whitespace-nowrap font-display text-base text-ink-900">
          Study<span className="highlight-mark">Assist</span>
        </span>

        <div className="flex gap-1 text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-colors ${
                  isActive
                    ? "highlight-mark font-medium text-ink-900"
                    : "text-ink-500 hover:text-ink-900"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4 whitespace-nowrap text-sm text-ink-500">
          {user && <span className="hidden sm:inline">{user.full_name || user.email}</span>}
          <NavLink to="/settings" className="hover:text-ink-900">
            Settings
          </NavLink>
          <button onClick={handleLogout} className="hover:text-ink-900">
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
