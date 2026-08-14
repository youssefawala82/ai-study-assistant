import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

const SUMMARY_TYPES = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "detailed", label: "Detailed" },
  { value: "bullet_points", label: "Bullet points" },
  { value: "key_concepts", label: "Key concepts" },
];

export default function DocumentSummary() {
  const { documentId } = useParams<{ documentId: string }>();
  const [summaryType, setSummaryType] = useState("short");
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (type: string) => {
    setSummaryType(type);
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/documents/${documentId}/summarize`, null, {
        params: { summary_type: type },
      });
      setSummary(data.summary);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't generate a summary.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-medium">Summarize document</h1>

      <div className="mt-4 flex gap-2">
        {SUMMARY_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => handleGenerate(t.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              summaryType === t.value ? "bg-accent text-white" : "bg-paper-200 text-ink-600 hover:bg-paper-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-paper-300 p-4">
        {isLoading && <p className="text-sm text-ink-500">Generating...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {summary && <p className="whitespace-pre-wrap text-sm text-ink-700">{summary}</p>}
        {!isLoading && !summary && !error && (
          <p className="text-sm text-ink-500">Pick a summary style above to generate one.</p>
        )}
      </div>
    </div>
  );
}
