import {createBullBoard} from "@bull-board/api";
import {ExpressAdapter} from "@bull-board/express";
import {BullMQAdapter} from "@bull-board/api/bullMQAdapter";
import {BullAdapter} from "@bull-board/api/bullAdapter";
import {Queue} from 'bullmq';
import Bull from 'bull';
import {backOff} from "exponential-backoff";

import {client, redisConfig, isCluster} from "./redis.js";
import {config} from "./config.js";

const BULL_CLUSTER_PREFIX_REQUIRED = 'BULL_CLUSTER_PREFIX_REQUIRED';

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

function assertBullClusterPrefix() {
	if (!isCluster || config.BULL_VERSION !== 'BULL') return;
	const prefix = config.BULL_PREFIX || '';
	const hasHashTag = /{[^}]+}/.test(prefix);
	if (!hasHashTag) {
		const err = new Error(
			'Redis Cluster with BULL requires BULL_PREFIX to include a hash tag, e.g. "{bull}". ' +
			'Alternatively set BULL_VERSION=BULLMQ.'
		);
		err.code = BULL_CLUSTER_PREFIX_REQUIRED;
		throw err;
	}
}

async function getRedisKeys(pattern) {
	if (isCluster) {
		const masters = client.nodes('master');
		if (!masters || masters.length === 0) {
			throw new Error('No master nodes available in the Redis Cluster');
		}
		const results = await Promise.allSettled(
			masters.map(node => node.keys(pattern))
		);
		const fulfilled = results.filter(r => r.status === 'fulfilled');
		const rejected = results.filter(r => r.status === 'rejected');
		if (rejected.length > 0) {
			console.error(
				`Failed to scan keys on ${rejected.length}/${masters.length} master node(s):`,
				rejected.map(r => r.reason?.message)
			);
		}
		if (fulfilled.length === 0) {
			throw new Error('All master nodes failed during key scan');
		}
		return fulfilled.flatMap(r => r.value);
	}
	return client.keys(pattern);
}

async function getBullQueues() {
	assertBullClusterPrefix();
	const keys = await getRedisKeys(`${config.BULL_PREFIX}:*`);
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
				connection: isCluster ? client : redisConfig.redis,
				...(config.BULL_PREFIX && {prefix: config.BULL_PREFIX})
			}, client.connection)) :
			new BullAdapter(new Bull(item, {
				...(isCluster
					? { createClient: () => {
						const dup = client.duplicate();
						dup.on('error', (err) => console.error(`Redis Cluster duplicate client error (queue "${item}"):`, err));
						return dup;
					}}
					: { redis: redisConfig.redis }),
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
				if (e?.code === BULL_CLUSTER_PREFIX_REQUIRED) {
					return false;
				}
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
