import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface CardItem {
  id: string;
  front: string;
  back: string;
  status: string;
}

export default function FlashcardStudy() {
  const { courseId } = useParams<{ courseId: string }>();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const loadCards = async () => {
    const { data } = await api.get("/flashcards", { params: { course_id: courseId } });
    setCards(data);
    setIndex(0);
    setFlipped(false);
  };

  useEffect(() => {
    loadCards();
  }, [courseId]);

  const mark = async (status: string) => {
    const card = cards[index];
    if (!card) return;
    await api.patch(`/flashcards/${card.id}`, { status });
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, cards.length));
  };

  if (cards.length === 0) return <p className="text-sm text-ink-500">No flashcards yet for this course.</p>;

  if (index >= cards.length) {
    return (
      <div>
        <p className="text-lg font-medium">You're done with this deck 🎉</p>
        <button onClick={loadCards} className="mt-3 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-paper-50">
          Study again
        </button>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="mx-auto max-w-md">
      <p className="text-sm text-ink-500">
        Card {index + 1} of {cards.length}
      </p>

      <div
        onClick={() => setFlipped((f) => !f)}
        className="mt-4 flex min-h-[200px] cursor-pointer items-center justify-center rounded-lg border border-paper-300 p-6 text-center"
      >
        <p className="text-lg">{flipped ? card.back : card.front}</p>
      </div>
      <p className="mt-2 text-center text-xs text-ink-300">Click the card to flip</p>

      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => mark("difficult")} className="rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-700">
          Difficult
        </button>
        <button onClick={() => mark("review_later")} className="rounded-lg bg-marker-100 px-3 py-1.5 text-sm text-ink-700">
          Review later
        </button>
        <button onClick={() => mark("learned")} className="rounded-lg bg-accent-100 px-3 py-1.5 text-sm text-accent-700">
          Learned
        </button>
      </div>
    </div>
  );
}
