import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api } from "../lib/api";

interface GradedResult {
  question_id: string;
  submitted_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string | null;
}

export default function QuizResults() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const location = useLocation();
  const passedState = location.state as { score: number; results: GradedResult[] } | undefined;

  const [score, setScore] = useState<number | null>(passedState?.score ?? null);
  const [results, setResults] = useState<GradedResult[]>(passedState?.results ?? []);

  useEffect(() => {
    if (passedState) return; // already have everything from navigation state
    api.get(`/quizzes/${quizId}/attempts/${attemptId}`).then(({ data }) => {
      setScore(data.score);
    });
  }, [quizId, attemptId, passedState]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium">Quiz results</h1>
      {score !== null && <p className="mt-2 text-2xl font-semibold">{score}%</p>}

      <div className="mt-6 flex flex-col gap-3">
        {results.map((r) => (
          <div
            key={r.question_id}
            className={`rounded-lg border p-3 text-sm ${
              r.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            }`}
          >
            <p>Your answer: {r.submitted_answer}</p>
            {!r.is_correct && <p>Correct answer: {r.correct_answer}</p>}
            {r.explanation && <p className="mt-1 text-ink-600">{r.explanation}</p>}
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-sm text-ink-500">Detailed breakdown isn't available after a page refresh — only the score is stored.</p>
        )}
      </div>
    </div>
  );
}
