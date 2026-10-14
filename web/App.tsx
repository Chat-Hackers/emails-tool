import "./App.css";
import { useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { getEmails, updateEmails } from "./requests";
import { type Frequency } from "../types";

const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
type EmailLists = Record<Frequency, string[]>;

const SEPARATORS = /[\s,;]+/; // spaces, newlines, commas (and semicolons)
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

function EmailBox({
  title,
  emails,
  onAdd,
  onRemove,
}: {
  title: string;
  emails: string[];
  onAdd: (addresses: string[]) => void;
  onRemove: (address: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // split text into tokens, add the valid ones, leave invalid ones in the input
  function commit(text: string) {
    const tokens = text.split(SEPARATORS).filter(Boolean);
    const valid = tokens.filter((t) => EMAIL_RE.test(t));
    const invalid = tokens.filter((t) => !EMAIL_RE.test(t));

    if (valid.length) onAdd(valid);
    setDraft(invalid.join(" "));
    setError(invalid.length ? `Not a valid email: ${invalid.join(", ")}` : "");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setDraft(value);
    // typing a separator completes the current address
    if (/[\s,;]$/.test(value)) commit(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && emails.length > 0) {
      onRemove(emails[emails.length - 1]); // backspace on empty input removes the last pill
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault(); // single-line inputs mangle newlines, so read the clipboard ourselves
    commit(`${draft} ${e.clipboardData.getData("text")}`);
  }

  return (
    <section className="email-box-section">
      <h2>{title}</h2>
      <div className="email-box" onClick={() => inputRef.current?.focus()}>
        {emails.map((address) => (
          <span className="pill" key={address}>
            {address}
            <button
              type="button"
              aria-label={`Remove ${address}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(address);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text" // not type="email", which rewrites pasted/typed values
          value={draft}
          placeholder={emails.length ? "" : "Type or paste email addresses"}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => draft && commit(draft)}
        />
      </div>
      {error && <p className="email-error">{error}</p>}
    </section>
  );
}

export default function App() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");

  const [emails, setEmails] = useState<EmailLists>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false; // ignore the response if the room changed meanwhile

    getEmails(roomId)
      .then((result) => {
        if (cancelled) return;
        setEmails({
          daily: result.daily ?? [],
          weekly: result.weekly ?? [],
          monthly: result.monthly ?? [],
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setStatus("Couldn't load email addresses.");
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // optimistic update: show the change immediately, roll back if the PUT fails
  async function save(frequency: Frequency, next: string[]) {
    if (!roomId) return;
    const previous = emails[frequency];

    setEmails((prev) => ({ ...prev, [frequency]: next }));
    setStatus("");

    try {
      await updateEmails(roomId, next, frequency);
    } catch (err) {
      console.error(err);
      setEmails((prev) => ({ ...prev, [frequency]: previous }));
      setStatus("Couldn't save your changes. Please try again.");
    }
  }

  function addEmails(frequency: Frequency, addresses: string[]) {
    save(frequency, [...new Set([...emails[frequency], ...addresses])]);
  }

  function removeEmail(frequency: Frequency, address: string) {
    save(
      frequency,
      emails[frequency].filter((a) => a !== address),
    );
  }

  return (
    <>
      <h1>Email Digests</h1>
      {status && <p className="email-error">{status}</p>}

      {FREQUENCIES.map((frequency) => (
        <EmailBox
          key={frequency}
          title={frequency[0].toUpperCase() + frequency.slice(1)}
          emails={emails[frequency]}
          onAdd={(addresses) => addEmails(frequency, addresses)}
          onRemove={(address) => removeEmail(frequency, address)}
        />
      ))}
    </>
  );
}
