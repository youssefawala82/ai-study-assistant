import { FormEvent, useState } from "react";
import { api } from "../lib/api";

export default function Explain() {
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.post("/explain", { text });
      setExplanation(data.explanation);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-medium">Explain like I'm 10</h1>
      <p className="mt-1 text-sm text-ink-500">Paste anything confusing and get the simple version.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          required
          className="rounded-lg border border-paper-300 px-3 py-2 text-sm"
          placeholder="e.g. Backpropagation adjusts neural network weights using gradients."
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-fit rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 disabled:opacity-50"
        >
          {isLoading ? "Explaining..." : "Explain it simply"}
        </button>
      </form>

      {explanation && (
        <div className="mt-6 rounded-lg border border-paper-300 p-4">
          <p className="whitespace-pre-wrap text-sm text-ink-700">{explanation}</p>
        </div>
      )}
    </div>
  );
}
