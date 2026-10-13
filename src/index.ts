import 'dotenv/config';
import express from "express";
import * as fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getEmailsByRoomId, insertEmail, removeEmail } from './duckdb';
import beginSchedule from "./scheduler";

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

  /*
 app.post("/", async (req, res) => {
   const { event } = req.body;

   let response: { message?: string } | undefined = {};

   if (event.type === "m.room.message")
     response = await handleMessage(event);

   console.log(response)

   res.send({ success: true, response });
 });
 
   app.get("/api/events", async (req, res) => {
     const { roomId } = req.query;
 
     const eventUrls = await getEventsByRoomId(roomId as string);
     const events = (
       await Promise.all(
         eventUrls.map(async (event) => {
           const eventDetails = await tryGetEvent(event.event_url as string);
           if (!eventDetails) return null;
           return {
             name: eventDetails.name,
             startDate: eventDetails.startDate,
             roomId: event.room_id as string,
             url: event.event_url as string
           };
         })
       )
     ).filter((event) => event !== null).filter(event => event.roomId === roomId);
 
     res.send(events);
   })*/

  app.post("/api/event", async (req, res) => {
    const { roomId } = req.query;
    const { url } = req.body;

    //await insertEvent(roomId as string, url);

    res.send({ success: true })
  })

  app.delete("/api/event", async (req, res) => {
    const { roomId } = req.query;
    const { url } = req.body;

    //await removeEvent(roomId as string, url);

    res.send({ success: true })
  })

  app.listen(port);
};

generateRegistrationFile();
start();

setTimeout(beginSchedule, 2000)
