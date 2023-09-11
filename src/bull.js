import {createBullBoard} from "@bull-board/api";
import {ExpressAdapter} from "@bull-board/express";
import {BullMQAdapter} from "@bull-board/api/bullMQAdapter";
import {BullAdapter} from "@bull-board/api/bullAdapter";
import * as bullmq from "bullmq";
import * as bull from "bullmq";

import {client, redisConfig} from "./redis";
import {config} from "./config";

const serverAdapter = new ExpressAdapter();
const {setQueues} = createBullBoard({queues: [], serverAdapter});
export const router = serverAdapter.getRouter();

async function setBullQueues() {
	const keys = await client.keys(`${config.BULL_PREFIX}:*`);
	const uniqKeys = new Set(keys.map(key => key.replace(/^.+?:(.+?):.+?$/, '$1')));
	const queueList = Array.from(uniqKeys).sort().map(
		(item) => config.BULL_VERSION === 'BULLMQ' ?
			new BullMQAdapter(new bullmq.Queue(item, {
				connection: redisConfig.redis,
			}, client.connection)) :
			new BullAdapter(new bull.Queue(item, {
				connection: redisConfig.redis,
			}, client.connection))
	);
	setQueues(queueList);
	console.log('🚀 done!')
}

setBullQueues();
