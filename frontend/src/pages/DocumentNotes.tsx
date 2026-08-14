import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface NoteItem {
  id: string;
  note_type: string;
  highlighted_text: string | null;
  generated_content: string;
  created_at: string;
}

const NOTE_TYPES = [
  { value: "note", label: "Note" },
  { value: "definition", label: "Definition" },
  { value: "formula", label: "Formula" },
  { value: "study_guide", label: "Study guide" },
];

export default function DocumentNotes() {
  const { documentId } = useParams<{ documentId: string }>();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [highlightedText, setHighlightedText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    const { data } = await api.get("/notes", { params: { document_id: documentId } });
    setNotes(data);
  };

  useEffect(() => {
    loadNotes();
  }, [documentId]);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);
    try {
      await api.post("/notes/generate", {
        document_id: documentId,
        highlighted_text: highlightedText || null,
        note_type: noteType,
      });
      setHighlightedText("");
      await loadNotes();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't generate a note.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-medium">Notes</h1>

      <form onSubmit={handleGenerate} className="mt-4 flex flex-col gap-3 rounded-lg border border-paper-300 p-4">
        <textarea
          value={highlightedText}
          onChange={(e) => setHighlightedText(e.target.value)}
          placeholder="Paste a passage from the document to turn into notes (optional — leave blank to summarize the whole document)"
          className="rounded-lg border border-paper-300 px-3 py-2 text-sm"
          rows={3}
        />
        <div className="flex items-center gap-2">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="rounded-lg border border-paper-300 px-2 py-1.5 text-sm"
          >
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isGenerating}
            className="rounded-lg bg-ink-900 px-3 py-1.5 text-sm font-medium text-paper-50 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate note"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-paper-300 p-4">
            <p className="text-xs font-medium uppercase text-ink-300">{n.note_type.replace("_", " ")}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{n.generated_content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
