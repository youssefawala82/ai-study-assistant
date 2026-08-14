import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface CourseItem {
  id: string;
  name: string;
}

export default function StudyPlanner() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/courses").then(({ data }) => setCourses(data));
  }, []);

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const subjects = selectedCourses.map((id) => {
        const course = courses.find((c) => c.id === id);
        return { course_id: id, name: course?.name };
      });
      const { data } = await api.post("/study-plans/generate", {
        exam_date: examDate,
        subjects,
        available_hours_per_day: hoursPerDay,
      });
      navigate(`/study-planner/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't generate a study plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-medium">Study planner</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">Exam date</label>
          <input
            type="date"
            required
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Available hours per day</label>
          <input
            type="number"
            min={0.5}
            max={16}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Subjects</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {courses.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCourse(c.id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  selectedCourses.includes(c.id) ? "bg-accent text-white" : "bg-paper-200 text-ink-600 hover:bg-paper-300"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || selectedCourses.length === 0}
          className="w-fit rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 disabled:opacity-50"
        >
          {isSubmitting ? "Generating..." : "Generate study plan"}
        </button>
      </form>
    </div>
  );
}
