import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import path from "node:path";

let connection: DuckDBConnection;
let instance: DuckDBInstance;

import { Frequency } from "../types";

export async function startDuckDB() {
    const emailsDuckDBFileName = "emails_duckdb.db";

    const dataDir = process.env.DUCKDB_DATA_DIR ?? path.resolve(__dirname, "../..");
    const dbPath = path.join(dataDir, emailsDuckDBFileName);

    instance = await DuckDBInstance.create(dbPath);
    connection = await instance.connect();

    const tables = [
        {
            name: "Emails",
            creationCommand:
                "CREATE TABLE Emails (room_id VARCHAR NOT NULL, email_address VARCHAR NOT NULL, frequency VARCHAR NOT NULL);",
        }
    ]

    const existingTablesRows = await connection.run("SHOW TABLES;");
    const existingTables = await existingTablesRows.getRowObjects();

    tables.forEach(async (table) => {
        const tableExists = existingTables.filter((existingTable) => existingTable.name === table.name).length > 0;

        if (tableExists) {
            console.log(`${table.name} already exists`);
        } else {
            await connection.run(table.creationCommand);
            console.log(`${table.name} created`);
        }
    });
}

export async function getEmailsAll() {
    const getEmails = `SELECT * FROM Emails;`;
    const prepared = await connection.prepare(getEmails);
    const emailsRows = await prepared.run();
    const emails = await emailsRows.getRowObjects();
    return emails;
}

export async function getEmailsByRoomId(roomId: string) {
    const getEmails = `SELECT * FROM Emails WHERE room_id = $1;`;
    const prepared = await connection.prepare(getEmails);
    prepared.bindVarchar(1, roomId);
    const emailsRows = await prepared.run();
    const emails = await emailsRows.getRowObjects();
    return emails;
}

export async function insertEmail(roomId: string, emailAddress: string, frequency: Frequency) {
    const insertEvent = `INSERT INTO Emails values ($1, $2, $3);`;
    const prepared = await connection.prepare(insertEvent);
    prepared.bindVarchar(1, roomId);
    prepared.bindVarchar(2, emailAddress);
    prepared.bindVarchar(3, frequency);
    await prepared.run();
    return;
}

export async function removeEmail(roomId: string, emailAddress: string) {
    const deleteEvent = `DELETE FROM Emails WHERE room_id=$1 AND email_address=$2;`;
    const prepared = await connection.prepare(deleteEvent);
    prepared.bindVarchar(1, roomId);
    prepared.bindVarchar(2, emailAddress);
    await prepared.run();
    return;
}

export async function replaceEmails(
    roomId: string,
    emailAddresses: string[],
    frequency: Frequency
) {
    await connection.run("BEGIN TRANSACTION");
    try {
        const del = await connection.prepare(
            `DELETE FROM Emails WHERE room_id = $1 AND frequency = $2;`
        );
        del.bindVarchar(1, roomId);
        del.bindVarchar(2, frequency);
        await del.run();

        for (const address of emailAddresses) {
            await insertEmail(roomId, address, frequency);
        }

        await connection.run("COMMIT");
    } catch (err) {
        await connection.run("ROLLBACK");
        throw err;
    }
}

startDuckDB();