import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function DocumentChat() {
  const { documentId } = useParams<{ documentId: string }>();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await api.post("/chats", { document_id: documentId });
      setChatId(data.id);
      const msgsRes = await api.get(`/chats/${data.id}/messages`);
      setMessages(msgsRes.data);
    };
    init();
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId) return;

    const question = input;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "user", content: question, created_at: new Date().toISOString() },
    ]);
    setIsSending(true);

    try {
      const { data } = await api.post(`/chats/${chatId}/messages`, { content: question });
      setMessages((prev) => [...prev, data]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h1 className="text-xl font-medium">Chat with document</h1>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-paper-300 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-ink-500">Ask anything about this document.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-ink-900 text-paper-50" : "bg-paper-200 text-ink-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isSending && <p className="text-sm text-ink-300">Thinking...</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this document..."
          className="flex-1 rounded-lg border border-paper-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isSending}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
