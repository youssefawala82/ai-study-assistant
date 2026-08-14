import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Summary {
  documents_uploaded: number;
  questions_asked: number;
  quizzes_completed: number;
  flashcards_reviewed: number;
  study_streak_days: number;
  time_spent_seconds: number;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default function Progress() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/progress/summary")
      .then(({ data }) => setSummary(data))
      .catch((err) => {
        setError(err?.response?.data?.detail || err?.message || "Couldn't load your progress.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="text-sm text-ink-500">Loading...</p>;

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-medium">Progress</h1>
        <p className="mt-4 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    { label: "Documents uploaded", value: summary.documents_uploaded },
    { label: "Questions asked", value: summary.questions_asked },
    { label: "Quizzes completed", value: summary.quizzes_completed },
    { label: "Flashcards reviewed", value: summary.flashcards_reviewed },
    { label: "Study streak", value: `${summary.study_streak_days} day${summary.study_streak_days === 1 ? "" : "s"}` },
    { label: "Time spent studying", value: formatDuration(summary.time_spent_seconds) },
  ];

  return (
    <div>
      <h1 className="text-xl font-medium">Progress</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="font-mono text-2xl text-ink-900">{c.value}</p>
            <p className="mt-1 text-sm text-ink-500">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}