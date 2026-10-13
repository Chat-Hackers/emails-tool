import { MatrixEvent } from "../types";

const { emails_secret, dashboard_url, summariser_url } = process.env;

const baseUrl = dashboard_url?.includes("localhost") ? `http://${dashboard_url}` : `https://${dashboard_url}`;

export async function getRoomEvents(roomId: string, since: Temporal.Instant) {
    return fetch(`${baseUrl}/api/room/history?roomId=${roomId}&since=${since.toString()}`);
}

export async function generateSummary(events: string) {
    return fetch(`${summariser_url}`, {
        method: "POST",
        body: JSON.stringify({
            model: "llm_auto-big",
            messages: [
                {
                    role: "user",
                    content: `I'm going to send a set of stripped down Matrix events 
            which I need you to summarise for an email digest. 
            Please return just the summary in simple html format (no styles) without a title or a markdown wrapper, 
            as this is going to go straight in an email. Put distinct events in different sections. 
            Use a netural tone. 
            ${events} `
                }
            ]
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })
}

