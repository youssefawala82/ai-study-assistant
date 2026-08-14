import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password/request", { email });
    } finally {
      setIsSubmitting(false);
      // Always show the same confirmation, whether or not the email exists.
      setSubmitted(true);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-xl font-medium">Reset your password</h1>

      {submitted ? (
        <p className="mt-4 text-sm text-ink-600">
          If an account exists for that email, a reset link has been sent. Check the
          backend logs for the token during local development.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-paper-300 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-ink-900 px-3 py-2 text-sm font-medium text-paper-50 disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-ink-500">
        <Link to="/login" className="font-medium text-ink-900">
          Back to login
        </Link>
      </p>
    </div>
  );
}
