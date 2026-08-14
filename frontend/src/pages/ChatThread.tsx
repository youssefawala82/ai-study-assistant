import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function ChatThread() {
  const { chatId } = useParams<{ chatId: string }>();
  const [title, setTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setIsLoading(true);
    const [chatRes, msgsRes] = await Promise.all([
      api.get(`/chats/${chatId}`),
      api.get(`/chats/${chatId}/messages`),
    ]);
    setTitle(chatRes.data.title);
    setMessages(msgsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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

  if (isLoading) return <p className="text-sm text-ink-500">Loading...</p>;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <Link to="/chats" className="text-sm text-ink-500 hover:text-ink-900">
        ← All chats
      </Link>
      <h1 className="mt-1 text-xl font-medium">{title || "Untitled chat"}</h1>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-paper-300 p-4">
        {messages.length === 0 && <p className="text-sm text-ink-500">No messages yet.</p>}
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
          placeholder="Continue the conversation..."
          className="field-input flex-1"
        />
        <button type="submit" disabled={isSending} className="btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}