import { ToadScheduler, CronJob, AsyncTask } from 'toad-scheduler';
import { sendEmails } from './emails';

export default function beginSchedule() {
    const scheduler = new ToadScheduler();

    const task = new AsyncTask(
        'send-digest-emails',
        async () => {
            await sendEmails();
        },
        (err) => {
            console.error('Digest email job failed:', err);
        }
    );

    const job = new CronJob(
        { cronExpression: '0 7 * * *', timezone: 'Europe/London' },
        task,
        { preventOverrun: true }
    );

    scheduler.addCronJob(job);

    process.on('SIGTERM', () => scheduler.stop());
    process.on('SIGINT', () => scheduler.stop());
}

