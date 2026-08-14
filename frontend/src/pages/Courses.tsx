import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface CourseItem {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export default function Courses() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<CourseItem[]>("/courses");
      setCourses(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/courses", { name, description: description || null });
      setName("");
      setDescription("");
      setShowForm(false);
      await loadCourses();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't create the course.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, courseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this course? This also deletes all its documents, quizzes, flashcards, chats, and notes. This can't be undone.")) {
      return;
    }
    await api.delete(`/courses/${courseId}`);
    await loadCourses();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Courses</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-ink-900 px-3 py-1.5 text-sm font-medium text-paper-50"
        >
          {showForm ? "Cancel" : "New course"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 rounded-lg border border-paper-300 p-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
              placeholder="e.g. Database Systems"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-fit rounded-lg bg-ink-900 px-3 py-1.5 text-sm font-medium text-paper-50 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create course"}
          </button>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {isLoading && <p className="text-sm text-ink-500">Loading...</p>}

        {!isLoading && courses.length === 0 && (
          <p className="text-sm text-ink-500">
            No courses yet — create one to start uploading study materials.
          </p>
        )}

        {courses.map((course) => (
          <Link
            key={course.id}
            to={`/courses/${course.id}`}
            className="group relative rounded-lg border border-paper-300 p-4 hover:border-ink-300"
          >
            <button
              onClick={(e) => handleDelete(e, course.id)}
              className="absolute right-3 top-3 text-xs text-ink-300 opacity-0 group-hover:opacity-100 hover:text-red-600"
            >
              Delete
            </button>
            <p className="font-medium">{course.name}</p>
            {course.description && (
              <p className="mt-1 text-sm text-ink-500 line-clamp-2">{course.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}