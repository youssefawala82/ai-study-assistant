import { Link } from "react-router-dom";

const FEATURES = [
  { title: "Chat with your documents", body: "Ask questions, get answers grounded in exactly what you uploaded." },
  { title: "Instant summaries", body: "Short, detailed, or bullet-point — pick the depth you need." },
  { title: "Auto-generated quizzes", body: "MCQ, true/false, fill-in-the-blank, scored instantly with explanations." },
  { title: "Flashcards that adapt", body: "Mark cards learned, difficult, or for review — study what actually needs it." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper-100">
      <div className="mx-auto flex max-w-3xl flex-col items-start px-6 pb-24 pt-20">
        <span className="page-eyebrow">for students who'd rather understand than re-read</span>

        <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">
          Turn your <span className="highlight-mark">course materials</span> into
          something you can actually talk to.
        </h1>

        <p className="mt-5 max-w-xl text-base text-ink-500">
          Upload a PDF, slide deck, or Word doc. Ask it questions, get a quiz out of it,
          or turn it into flashcards — instead of reading it cover to cover.
        </p>

        <div className="mt-8 flex gap-3">
          <Link to="/signup" className="btn-primary">
            Get started
          </Link>
          <Link to="/login" className="btn-secondary">
            Log in
          </Link>
        </div>

        <div className="mt-20 grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card p-5">
              <span className="page-eyebrow">0{i + 1}</span>
              <p className="mt-2 font-display text-lg text-ink-900">{f.title}</p>
              <p className="mt-1 text-sm text-ink-500">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
