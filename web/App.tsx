import "./App.css";
import { useSearchParams } from "react-router";
import { useRef, useState } from "react";

const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
type Frequency = (typeof FREQUENCIES)[number];
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

  // TODO: replace with requests once they exist (load on mount, post, delete)
  function addEmails(frequency: Frequency, addresses: string[]) {
    setEmails((prev) => ({
      ...prev,
      [frequency]: [...new Set([...prev[frequency], ...addresses])], // dedupes within a list
    }));
  }

  function removeEmail(frequency: Frequency, address: string) {
    setEmails((prev) => ({
      ...prev,
      [frequency]: prev[frequency].filter((a) => a !== address),
    }));
  }

  return (
    <>
      <h1>Email Digests</h1>
      {roomId && <p>Room: {roomId}</p>}

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
