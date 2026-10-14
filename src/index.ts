import 'dotenv/config';
import express from "express";
import * as fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getEmailsByRoomId, replaceEmails } from './duckdb';
import beginSchedule from "./scheduler";
import { DAILY, WEEKLY, MONTHLY, FREQUENCIES } from '../types';
import { type Frequency } from '../types';

const { emails_secret } = process.env;

const port = 5056;

const moduleRegistration = {
  id: "emails",
  uuid: uuidv4(),
  url: `http://localhost:${port}`,
  emoji: "📧",
  introduction: "Open the dashboard and add go to the emails section to add emails",
  title: "Email Summaries",
  description: "Sends daily/weekly/monthly email summaries of the chat",
  emails_secret,
  event_types: [
    "m.room.message"
  ]
}

function generateRegistrationFile() {
  fs.writeFileSync(`./${moduleRegistration.id}.json`, JSON.stringify(moduleRegistration, null, 2));
}

async function start() {

  const app = express();
  app.use(express.json());

  app.get("/", async (req, res) => {
    const htmlPath = path.resolve(__dirname, "../../web/dist/index.html")

    res.sendFile(htmlPath);
  })

  app.get("/api/emails", async (req, res) => {
    const roomId = req.query.roomId;
    if (typeof roomId !== "string" || !roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    try {
      const rows = (await getEmailsByRoomId(roomId)) as {
        room_id: string;
        email_address: string;
        frequency: Frequency;
      }[];

      const lists: Record<Frequency, string[]> = { [DAILY]: [], [WEEKLY]: [], [MONTHLY]: [] };
      for (const row of rows) {
        lists[row.frequency]?.push(row.email_address);
      }
      res.json(lists);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load emails" });
    }
  });

  app.put("/api/emails", async (req, res) => {
    const { roomId, emails, frequency } = req.body ?? {};
    const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

    if (typeof roomId !== "string" || !roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }
    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).json({ error: `frequency must be one of ${FREQUENCIES.join(", ")}` });
    }
    if (!Array.isArray(emails) || !emails.every((e) => typeof e === "string")) {
      return res.status(400).json({ error: "emails must be an array of strings" });
    }

    // normalise and dedupe, then reject anything invalid
    const cleaned = [...new Set(emails.map((e: string) => e.trim().toLowerCase()))];
    const invalid = cleaned.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length) {
      return res.status(400).json({ error: "Invalid email addresses", invalid });
    }

    try {
      await withWriteLock(() => replaceEmails(roomId, cleaned, frequency));
      res.json({ roomId, frequency, emails: cleaned });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save emails" });
    }
  });

  // DuckDB transactions are per connection, so two overlapping PUTs sharing one
  // connection would interleave their BEGIN/COMMIT. Run writes one at a time.
  let writeQueue: Promise<unknown> = Promise.resolve();
  function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const result = writeQueue.then(fn);
    writeQueue = result.catch(() => { }); // keep the queue alive after a failure
    return result;
  }

  app.listen(port);
};

generateRegistrationFile();
start();

setTimeout(beginSchedule, 2000)
