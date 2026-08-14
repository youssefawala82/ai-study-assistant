import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface QuizItem {
  id: string;
  title: string;
  difficulty: string | null;
  created_at: string;
}

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);

  const loadQuizzes = async () => {
    const { data } = await api.get("/quizzes");
    setQuizzes(data);
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleDelete = async (e: React.MouseEvent, quizId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this quiz? This can't be undone.")) return;
    await api.delete(`/quizzes/${quizId}`);
    await loadQuizzes();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Quizzes</h1>
        <Link to="/quizzes/new" className="btn-primary">
          New quiz
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {quizzes.length === 0 && (
          <p className="text-sm text-ink-500">No quizzes yet — generate one from a document or course.</p>
        )}
        {quizzes.map((q) => (
          <Link
            key={q.id}
            to={`/quizzes/${q.id}`}
            className="group flex items-center justify-between rounded-lg border border-paper-300 px-4 py-3 hover:border-ink-300"
          >
            <span className="text-sm font-medium">{q.title}</span>
            <span className="flex items-center gap-4">
              <span className="text-xs text-ink-500">{q.difficulty}</span>
              <button
                onClick={(e) => handleDelete(e, q.id)}
                className="text-xs text-ink-300 opacity-0 group-hover:opacity-100 hover:text-red-600"
              >
                Delete
              </button>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}