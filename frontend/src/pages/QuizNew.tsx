import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface CourseItem {
  id: string;
  name: string;
}

const QUESTION_TYPES = ["mcq", "true_false", "fill_blank", "short_answer"];

export default function QuizNew() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseId, setCourseId] = useState("");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["mcq"]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/courses").then(({ data }) => setCourses(data));
  }, []);

  const toggleType = (type: string) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/quizzes/generate", {
        course_id: courseId,
        question_types: questionTypes,
        num_questions: numQuestions,
        difficulty,
      });
      navigate(`/quizzes/${data.quiz_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't generate the quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-medium">Generate a quiz</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">Course</label>
          <select
            required
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
          >
            <option value="">Select a course...</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Question types</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => toggleType(t)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  questionTypes.includes(t) ? "bg-accent text-white" : "bg-paper-200 text-ink-600 hover:bg-paper-300"
                }`}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div>
            <label className="text-sm font-medium">Number of questions</label>
            <input
              type="number"
              min={1}
              max={30}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || questionTypes.length === 0}
          className="w-fit rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 disabled:opacity-50"
        >
          {isSubmitting ? "Generating..." : "Generate quiz"}
        </button>
      </form>
    </div>
  );
}
