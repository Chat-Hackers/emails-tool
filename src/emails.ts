import { Resend } from 'resend';
import { getRoomEvents, generateSummary } from './requests';
import { getEmailsAll, insertEmail } from './duckdb';
import { MatrixEvent, ChatCompletionResponse, EmailPref, Frequency, Email } from '../types';
import { DAILY, WEEKLY, MONTHLY } from '../types';

const { resend_api_key } = process.env;

const resend = new Resend(resend_api_key);

async function sendEmail(address: string, subject: string, text: string) {
    resend.emails.send({
        from: 'digest@dashboard.chathackers.uk',
        to: address,
        subject: subject,
        html: text
    });
}

async function getDigest(room_id: string, since: Temporal.Instant) {
    const eventsResponse = await getRoomEvents(room_id, since);
    const eventsResult = await eventsResponse.json();
    const { events, roomName } = eventsResult as { events: MatrixEvent[], roomName: string };

    const messages = events.filter(event => event.type === "m.room.message").map(event => (`{ from: ${event.sender}, content: ${event.content.body} }`)).reverse();

    const digestResponse = await generateSummary(messages.join(","));
    const digestResult = await digestResponse.json() as ChatCompletionResponse;

    const digest = digestResult.choices[0].message.content ?? "";

    return { digest, groupName: roomName };
}

async function getDailyDigest(room_id: string) {
    const yesterday = Temporal.Now.instant().subtract({ hours: 24 });

    return getDigest(room_id, yesterday);
}

async function getWeeklyDigest(room_id: string) {
    const now = Temporal.Now.zonedDateTimeISO();
    const lastWeek = now.subtract({ days: 7 }).toInstant();

    return getDigest(room_id, lastWeek);
}

async function getMonthlyDigest(room_id: string) {
    const now = Temporal.Now.zonedDateTimeISO();
    const lastMonth = now.subtract({ months: 1 }).toInstant();

    return getDigest(room_id, lastMonth);
}

type DigestResult = { digest: string; groupName: string };

const digestFetchers = {
    [DAILY]: getDailyDigest,
    [WEEKLY]: getWeeklyDigest,
    [MONTHLY]: getMonthlyDigest,
} satisfies Record<Frequency, (roomId: string) => Promise<DigestResult>>;

const frequencyLabels: Record<Frequency, string> = {
    [DAILY]: "Daily",
    [WEEKLY]: "Weekly",
    [MONTHLY]: "Monthly",
};

async function prepareEmails(): Promise<Email[]> {
    const emailPrefs = (await getEmailsAll()) as EmailPref[];
    const digestGroups: Record<string, Partial<Record<Frequency, string[]>>> = {};

    emailPrefs.forEach((emailPref) => {
        const group = (digestGroups[emailPref.room_id] ??= {});
        (group[emailPref.frequency] ??= []).push(emailPref.email_address);
    });

    const today = Temporal.Now.zonedDateTimeISO("Europe/London");
    const dueFrequencies = new Set<Frequency>([DAILY]);

    if (today.day === 1) dueFrequencies.add(MONTHLY);

    if (today.dayOfWeek === 1) dueFrequencies.add(WEEKLY);

    const emails: Email[] = [];

    for (const [roomId, group] of Object.entries(digestGroups)) {
        for (const frequency of dueFrequencies) {
            const addresses = group[frequency];
            if (!addresses?.length) continue;

            const { groupName, digest } = await digestFetchers[frequency](roomId);

            const subject = `${frequencyLabels[frequency]} Digest of ${groupName}`;

            for (const address of addresses) {
                emails.push({ address, subject, text: digest });
            }
        }
    }

    return emails;
}

export async function sendEmails() {
    const emails = await prepareEmails();
    for (const { address, subject, text } of emails) {
        await sendEmail(address, subject, text);
    }
}