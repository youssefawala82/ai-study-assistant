import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface CourseItem {
  id: string;
  name: string;
}

export default function Flashcards() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseId, setCourseId] = useState("");
  const [numCards, setNumCards] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/courses").then(({ data }) => setCourses(data));
  }, []);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);
    try {
      await api.post("/flashcards/generate", { course_id: courseId, num_cards: numCards });
      navigate(`/flashcards/${courseId}/study`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't generate flashcards.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-medium">Flashcards</h1>

      <form onSubmit={handleGenerate} className="mt-6 flex flex-col gap-4">
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
          <label className="text-sm font-medium">Number of cards</label>
          <input
            type="number"
            min={5}
            max={50}
            value={numCards}
            onChange={(e) => setNumCards(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-fit rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate flashcards"}
        </button>
      </form>

      {courseId && (
        <Link to={`/flashcards/${courseId}/study`} className="mt-4 inline-block text-sm text-ink-500 hover:text-ink-900">
          Or study existing flashcards for this course →
        </Link>
      )}
    </div>
  );
}
