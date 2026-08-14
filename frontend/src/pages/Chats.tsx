import { MouseEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface ChatItem {
  id: string;
  title: string | null;
  created_at: string;
}

export default function Chats() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadChats = async () => {
    setIsLoading(true);
    const { data } = await api.get("/chats");
    setChats(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const handleDelete = async (e: MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this chat? This can't be undone.")) return;
    await api.delete(`/chats/${chatId}`);
    await loadChats();
  };

  return (
    <div>
      <h1 className="text-xl font-medium">Chat history</h1>

      <div className="mt-4 flex flex-col gap-2">
        {isLoading && <p className="text-sm text-ink-500">Loading...</p>}

        {!isLoading && chats.length === 0 && (
          <p className="text-sm text-ink-500">
            No chats yet — open a document and click "Chat" to start one.
          </p>
        )}

        {chats.map((c) => (
          <Link
            key={c.id}
            to={`/chats/${c.id}`}
            className="group flex items-center justify-between rounded-lg border border-paper-300 px-4 py-3 hover:border-ink-300"
          >
            <span className="text-sm font-medium">{c.title || "Untitled chat"}</span>
            <span className="flex items-center gap-4">
              <span className="text-xs text-ink-500">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => handleDelete(e, c.id)}
                className="text-xs text-ink-300 opacity-0 group-hover:opacity-100 hover:text-red-600"
              >
                Delete
              </button>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}