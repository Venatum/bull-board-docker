import {createBullBoard} from "@bull-board/api";
import {ExpressAdapter} from "@bull-board/express";
import {BullMQAdapter} from "@bull-board/api/bullMQAdapter";
import {BullAdapter} from "@bull-board/api/bullAdapter";
import {Queue} from 'bullmq';
import Bull from 'bull';
import {backOff} from "exponential-backoff";

import {client, redisConfig} from "./redis.js";
import {config} from "./config.js";

const serverAdapter = new ExpressAdapter();
const {setQueues} = createBullBoard({
	queues: [],
	serverAdapter,
	options: {
		uiConfig: {
			...(config.BULL_BOARD_TITLE && {boardTitle: config.BULL_BOARD_TITLE}),
			...(config.BULL_BOARD_LOGO_PATH && {
				boardLogo: {
					path: config.BULL_BOARD_LOGO_PATH
				},
				...(config.BULL_BOARD_LOGO_WIDTH && {width: config.BULL_BOARD_LOGO_WIDTH}),
				...(config.BULL_BOARD_LOGO_HEIGHT && {height: config.BULL_BOARD_LOGO_HEIGHT}),
			}),
			...(config.BULL_BOARD_FAVICON && {
				favIcon: {
					default: config.BULL_BOARD_FAVICON
				},
				...(config.BULL_BOARD_FAVICON_ALTERNATIVE && {alternative: config.BULL_BOARD_FAVICON_ALTERNATIVE}),
			}),
			locale: {
				...(config.BULL_BOARD_LOCALE && {lng: config.BULL_BOARD_LOCALE}),
			},
			dateFormats: {
				...(config.BULL_BOARD_DATE_FORMATS_SHORT && {short: config.BULL_BOARD_DATE_FORMATS_SHORT}),
				...(config.BULL_BOARD_DATE_FORMATS_COMMON && {common: config.BULL_BOARD_DATE_FORMATS_COMMON}),
				...(config.BULL_BOARD_DATE_FORMATS_FULL && {full: config.BULL_BOARD_DATE_FORMATS_FULL}),
			}
		}
	}
});
export const router = serverAdapter.getRouter();

async function getBullQueues() {
	const keys = await client.keys(`${config.BULL_PREFIX}:*`);
	const uniqKeys = new Set(keys.map(key => key.replace(/^.+?:(.+?):.+?$/, '$1')));

	// This increases the number of connections.
	// Example: on a cluster I went from an average of 100 to 28k
	// const uniqKeys = new Set(keys.map(key => key.replace(
	// 	new RegExp(`^${config.BULL_PREFIX}:(.+):[^:]+$`),
	// 	'$1'
	// )));

	const queueList = Array.from(uniqKeys).sort().map(
		(item) => config.BULL_VERSION === 'BULLMQ' ?
			new BullMQAdapter(new Queue(item, {
				connection: redisConfig.redis,
				...(config.BULL_PREFIX && {prefix: config.BULL_PREFIX})
			}, client.connection)) :
			new BullAdapter(new Bull(item, {
				redis: redisConfig.redis,
				...(config.BULL_PREFIX && {prefix: config.BULL_PREFIX})
			}, client.connection))
	);
	if (queueList.length === 0) {
		throw new Error("No queue found.");
	}
	return queueList;
}

async function bullMain() {
	try {
		const queueList = await backOff(() => getBullQueues(), {
			delayFirstAttempt: false,
			jitter: "none",
			startingDelay: config.BACKOFF_STARTING_DELAY,
			maxDelay: config.BACKOFF_MAX_DELAY,
			timeMultiple: config.BACKOFF_TIME_MULTIPLE,
			numOfAttempts: config.BACKOFF_NB_ATTEMPTS,
			retry: (e, attemptNumber) => {
				console.log(`No queue! Retry n°${attemptNumber}`);
				return true;
			},
		});
		setQueues(queueList);
		console.log('🚀 done!')
	} catch (err) {
		console.error(err);
	}
}

// Only run bullMain in non-test environment
if (process.env.NODE_ENV !== 'test') {
	bullMain();
}

// Export for testing
export {bullMain, getBullQueues};
