import { type Frequency } from "../types";

const { origin, pathname } = window.location;
const BASE_URL = `${origin}${pathname}`;

export type EmailLists = Record<Frequency, string[]>;

export async function getEmails(roomId: string): Promise<Partial<EmailLists>> {
    const res = await fetch(`${BASE_URL}/api/emails?roomId=${encodeURIComponent(roomId)}`);
    if (!res.ok) throw new Error(`Failed to load emails: ${res.status}`);
    return res.json();
}

export async function updateEmails(roomId: string, emails: string[], frequency: Frequency) {
    const res = await fetch(`${BASE_URL}/api/emails?roomId=${encodeURIComponent(roomId)}`, {
        method: "PUT",
        body: JSON.stringify({ roomId, emails, frequency }),
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Failed to save emails: ${res.status}`);
    return res.json();
}