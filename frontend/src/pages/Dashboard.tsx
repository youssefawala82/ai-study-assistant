import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Summary {
  documents_uploaded: number;
  questions_asked: number;
  quizzes_completed: number;
  study_streak_days: number;
}

const QUICK_LINKS = [
  { to: "/courses", label: "Your courses", body: "Upload materials, browse by subject" },
  { to: "/quizzes/new", label: "Generate a quiz", body: "Turn a document into a scored quiz" },
  { to: "/flashcards", label: "Flashcards", body: "Auto-generate and review a deck" },
  { to: "/study-planner", label: "Study planner", body: "Get a schedule before your exam" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.get("/progress/summary").then(({ data }) => setSummary(data));
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0];

  return (
    <div>
      <h1 className="text-3xl">
        Welcome back{firstName ? `, ${firstName}` : ""}
        {summary && summary.study_streak_days > 0 ? (
          <span className="highlight-mark ml-2">{summary.study_streak_days}-day streak</span>
        ) : null}
      </h1>

      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Documents", value: summary.documents_uploaded },
            { label: "Questions asked", value: summary.questions_asked },
            { label: "Quizzes done", value: summary.quizzes_completed },
            { label: "Streak (days)", value: summary.study_streak_days },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="font-mono text-2xl text-ink-900">{s.value}</p>
              <p className="mt-1 text-xs text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <p className="page-eyebrow mt-10">jump back in</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="card p-5 transition-colors hover:border-ink-300">
            <p className="font-display text-lg text-ink-900">{l.label}</p>
            <p className="mt-1 text-sm text-ink-500">{l.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
