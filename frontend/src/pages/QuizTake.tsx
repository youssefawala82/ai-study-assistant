import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

interface QuestionItem {
  id: string;
  question_type: string;
  question_text: string;
  options: Record<string, string> | null;
}

interface QuizData {
  id: string;
  title: string;
  questions: QuestionItem[];
}

export default function QuizTake() {
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/quizzes/${quizId}`).then(({ data }) => setQuiz(data));
  }, [quizId]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data } = await api.post(`/quizzes/${quizId}/attempts`, { answers });
      navigate(`/quizzes/${quizId}/results/${data.attempt_id}`, { state: data });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!quiz) return <p className="text-sm text-ink-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium">{quiz.title}</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-paper-300 p-4">
            <p className="text-sm font-medium">
              {i + 1}. {q.question_text}
            </p>

            {q.question_type === "mcq" && q.options && (
              <div className="mt-3 flex flex-col gap-2">
                {Object.entries(q.options).map(([key, text]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      value={key}
                      checked={answers[q.id] === key}
                      onChange={() => setAnswer(q.id, key)}
                    />
                    <span>
                      {key}. {text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {q.question_type === "true_false" && (
              <div className="mt-3 flex gap-4">
                {["True", "False"].map((val) => (
                  <label key={val} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      value={val}
                      checked={answers[q.id] === val}
                      onChange={() => setAnswer(q.id, val)}
                    />
                    {val}
                  </label>
                ))}
              </div>
            )}

            {(q.question_type === "fill_blank" || q.question_type === "short_answer") && (
              <input
                type="text"
                value={answers[q.id] || ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className="mt-3 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
                placeholder="Your answer"
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-fit rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit quiz"}
        </button>
      </form>
    </div>
  );
}
