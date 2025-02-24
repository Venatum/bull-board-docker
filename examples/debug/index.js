import {createClient} from "ioredis";
import {Queue, Worker} from "bullmq";

const MAX_JOBS = 100;
export const client = createClient({
	port: 6379,
	host: 'localhost',
	db: '0',
	tls: false,
	maxRetriesPerRequest: null,
});
client.on('error', err => console.log('Redis Client Error', err));

async function createJobs(queueName) {
	const queue = new Queue(queueName, {
		connection: client,
	});
	console.log("⌛ Creating jobs...");
	for (let i = 0; i < MAX_JOBS; i++) {
		await queue.add(`test-job-${i}`, {
				name: "toto",
				data: {
					number: i
				},
				opts: {
					attempts: 0,
				}
			}
		);
	}
	console.log("🚀 done!");
}

async function createJobScheduler(queueName) {
	const queue = new Queue(queueName, {
		connection: client,
	});
	console.log("⌛ Creating job schedulers...");
	for (let i = 0; i < MAX_JOBS; i++) {
		await queue.upsertJobScheduler(`test-scheduler-${i}`, {
				pattern: `0 * * * *`,
				utc: true,
				immediately: true,
			}, {
				name: "toto",
				data: {
					number: i
				},
				opts: {
					attempts: 0,
				},
			},
		);
	}
	console.log("🚀 done!");
}

function worker(queueName) {
	new Worker(queueName, (job) => {
		// job.moveToFailed()
		throw new Error("test error");
	}, {
		connection: client,

	});
}

async function main() {
	const queueName = "test-queue";
	// await createJobs(queueName);
	await createJobScheduler(queueName);
	worker(queueName);
	// client.quit();
}

main();
