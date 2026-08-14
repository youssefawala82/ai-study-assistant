import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

interface CourseItem {
  id: string;
  name: string;
  description: string | null;
}

interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  file_size_bytes: number | null;
  uploaded_at: string;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseItem | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const [courseRes, docsRes] = await Promise.all([
      api.get<CourseItem>(`/courses/${courseId}`),
      api.get<DocumentItem[]>(`/courses/${courseId}/documents`),
    ]);
    setCourse(courseRes.data);
    setDocuments(docsRes.data);
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/courses/${courseId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Upload failed. Supported types: PDF, DOCX, PPTX, TXT.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (documentId: string) => {
    await api.delete(`/documents/${documentId}`);
    await loadData();
  };

  if (!course) return <p className="text-sm text-ink-500">Loading...</p>;

  return (
    <div>
      <Link to="/courses" className="text-sm text-ink-500 hover:text-ink-900">
        ← All courses
      </Link>
      <h1 className="mt-2 text-xl font-medium">{course.name}</h1>
      {course.description && <p className="mt-1 text-sm text-ink-500">{course.description}</p>}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-700">Documents</h2>
        <label className="cursor-pointer rounded-lg bg-ink-900 px-3 py-1.5 text-sm font-medium text-paper-50">
          {isUploading ? "Uploading..." : "Upload document"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.txt"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {documents.length === 0 && (
          <p className="text-sm text-ink-500">
            No documents yet. Upload a PDF, DOCX, PPTX, or TXT file to get started.
          </p>
        )}

        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-lg border border-paper-300 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{doc.filename}</p>
              <p className="text-xs text-ink-500">
                {doc.file_type.toUpperCase()} · {formatSize(doc.file_size_bytes)} · {doc.status}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-ink-500">
              <Link to={`/documents/${doc.id}/chat`} className="hover:text-ink-900">
                Chat
              </Link>
              <Link to={`/documents/${doc.id}/summary`} className="hover:text-ink-900">
                Summarize
              </Link>
              <button onClick={() => handleDelete(doc.id)} className="hover:text-red-600">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
