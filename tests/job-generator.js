#!/usr/bin/env node

import {Queue} from 'bullmq';
import Bull from 'bull';
import Redis from 'ioredis';
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({
	quiet: true
});

// Constants
const DEFAULTS = {
	VERSION: 'bullmq',
	PREFIX: 'bull',
	QUEUE_NAME: 'test-queue',
	COUNT: 5,
	TYPE: 'default'
};

const JOB_TYPES = {
	DEFAULT: 'default',
	DELAYED: 'delayed',
	REPEATED: 'repeated',
	PRIORITY: 'priority',
	FAILED: 'failed'
};

const QUEUE_VERSIONS = {
	BULLMQ: 'bullmq',
	BULL: 'bull'
};

// Job configuration constants
const JOB_CONFIG = {
	DELAY_INTERVAL: 5_000, // 5 seconds
	REPEAT_INTERVAL: 30_000, // 30 seconds
	REPEAT_LIMIT: 3,
	MAX_PRIORITY: 10,
	MIN_PRIORITY: 1
};

/**
 * Redis configuration factory
 */
class RedisConfigFactory {
	static createConfig() {
		return {
			port: process.env.REDIS_PORT,
			host: process.env.REDIS_HOST,
			db: process.env.REDIS_DB,
			...(process.env.REDIS_PASSWORD && {password: process.env.REDIS_PASSWORD}),
			...(process.env.REDIS_USER && {username: process.env.REDIS_USER}),
		};
	}
}

/**
 * Input validation utilities
 */
class ValidationUtils {
	static validateOptions(options) {
		const errors = [];

		if (options.version && !Object.values(QUEUE_VERSIONS).includes(options.version.toLowerCase())) {
			errors.push(`Invalid version: ${options.version}. Must be one of: ${Object.values(QUEUE_VERSIONS).join(', ')}`);
		}

		if (options.type && !Object.values(JOB_TYPES).includes(options.type)) {
			errors.push(`Invalid job type: ${options.type}. Must be one of: ${Object.values(JOB_TYPES).join(', ')}`);
		}

		if (options.count && (isNaN(options.count) || options.count <= 0)) {
			errors.push(`Invalid count: ${options.count}. Must be a positive number`);
		}

		if (errors.length > 0) {
			throw new Error(`Validation errors:\n${errors.join('\n')}`);
		}
	}
}

class JobGenerator {
	constructor(options = {}) {
		// Validate input options
		ValidationUtils.validateOptions(options);

		// Set properties with defaults
		this.version = (options.version || DEFAULTS.VERSION).toLowerCase();
		this.prefix = options.prefix || DEFAULTS.PREFIX;
		this.queueName = options.queue || DEFAULTS.QUEUE_NAME;
		this.count = options.count || DEFAULTS.COUNT;
		this.type = options.type || DEFAULTS.TYPE;
		this.all = options.all || false;

		// Initialize Redis client and queue
		this.redisClient = null;
		this.queue = null;
		this._initializeConnections();
	}

	/**
	 * Initialize Redis client and queue connections
	 * @private
	 */
	_initializeConnections() {
		try {
			// Create Redis client
			this.redisClient = Redis.createClient(RedisConfigFactory.createConfig());
			this.redisClient.on('error', (err) => console.error('Redis Client Error:', err));

			// Initialize queue
			this._initializeQueue();
		} catch (error) {
			throw new Error(`Failed to initialize connections: ${error.message}`);
		}
	}

	/**
	 * Initialize queue based on version
	 * @private
	 */
	_initializeQueue() {
		if (this.version === QUEUE_VERSIONS.BULLMQ) {
			this.queue = new Queue(this.queueName, {
				prefix: this.prefix
			}, this.redisClient.connection);
		} else {
			this.queue = new Bull(this.queueName, {
				prefix: this.prefix
			}, this.redisClient.connection);
		}
	}

	/**
	 * Generate jobs based on configuration
	 * @returns {Promise<Array>} Array of created jobs
	 */
	async generateJobs() {
		this._logGenerationStart();

		const jobs = [];
		const errors = [];

		if (this.all) {
			// Generate jobs for all types
			const jobTypes = Object.values(JOB_TYPES);
			let jobIndex = 1;

			for (const jobType of jobTypes) {
				console.log(`\n📝 Creating ${this.count} ${jobType} jobs...`);

				for (let i = 1; i <= this.count; i++) {
					try {
						const jobData = this._createJobData(jobIndex, jobType);
						const job = await this._createJobByType(jobType, jobData, jobIndex);

						jobs.push(job);
						console.log(`✅ Created ${jobType} job ${i}: ${job.id || job.name || 'unknown'}`);
						jobIndex++;

					} catch (error) {
						const errorMsg = `Failed to create ${jobType} job ${i}: ${error.message}`;
						console.error(`❌ ${errorMsg}`);
						errors.push(errorMsg);
						jobIndex++;
					}
				}
			}
		} else {
			// Generate jobs for single type
			for (let i = 1; i <= this.count; i++) {
				try {
					const jobData = this._createJobData(i, this.type);
					const job = await this._createJobByType(this.type, jobData, i);

					jobs.push(job);
					console.log(`✅ Created job ${i}: ${job.id || job.name || 'unknown'}`);

				} catch (error) {
					const errorMsg = `Failed to create job ${i}: ${error.message}`;
					console.error(`❌ ${errorMsg}`);
					errors.push(errorMsg);
				}
			}
		}

		this._logGenerationComplete(jobs.length, errors.length);
		return {jobs, errors};
	}

	/**
	 * Create job data object
	 * @param {number} index - Job index
	 * @param {string} jobType - Job type (optional, defaults to this.type)
	 * @returns {Object} Job data
	 * @private
	 */
	_createJobData(index, jobType = this.type) {
		return {
			id: index,
			message: `Test job ${index} of type ${jobType}`,
			timestamp: new Date().toISOString(),
			type: jobType,
			generator: 'job-generator-script',
			version: this.version
		};
	}

	/**
	 * Log generation start information
	 * @private
	 */
	_logGenerationStart() {
		if (this.all) {
			const totalJobs = this.count * Object.values(JOB_TYPES).length;
			console.log(`🚀 Generating ${this.count} jobs of each type (${totalJobs} total) using ${this.version.toUpperCase()}`);
		} else {
			console.log(`🚀 Generating ${this.count} ${this.type} jobs using ${this.version.toUpperCase()}`);
		}
		console.log(`📋 Queue: ${this.queueName} (prefix: ${this.prefix})`);
		console.log('');
	}

	/**
	 * Log generation completion information
	 * @param {number} successCount - Number of successful jobs
	 * @param {number} errorCount - Number of failed jobs
	 * @private
	 */
	_logGenerationComplete(successCount, errorCount) {
		console.log('');
		if (errorCount > 0) {
			console.log(`🎉 Generation complete! ${successCount} jobs created, ${errorCount} failed.`);
		} else {
			console.log(`🎉 Successfully generated ${successCount} jobs!`);
		}
	}

	/**
	 * Job factory methods
	 */
	async _createJobByType(type, data, index) {
		const jobFactories = {
			[JOB_TYPES.DEFAULT]: () => this._createDefaultJob(data, index),
			[JOB_TYPES.DELAYED]: () => this._createDelayedJob(data, index),
			[JOB_TYPES.REPEATED]: () => this._createRepeatedJob(data, index),
			[JOB_TYPES.PRIORITY]: () => this._createPriorityJob(data, index),
			[JOB_TYPES.FAILED]: () => this._createFailedJob(data, index)
		};

		const factory = jobFactories[type];
		if (!factory) {
			throw new Error(`Unknown job type: ${type}`);
		}

		return await factory();
	}

	async _createDefaultJob(data, index) {
		const jobName = `${JOB_TYPES.DEFAULT}-job-${index}`;
		return await this.queue.add(jobName, data);
	}

	async _createDelayedJob(data, index) {
		const jobName = `${JOB_TYPES.DELAYED}-job-${index}`;
		const delay = index * JOB_CONFIG.DELAY_INTERVAL;

		return await this.queue.add(jobName, data, {delay});
	}

	async _createRepeatedJob(data, index) {
		const jobName = `${JOB_TYPES.REPEATED}-job-${index}`;

		return await this.queue.add(jobName, data, {
			repeat: {
				every: JOB_CONFIG.REPEAT_INTERVAL,
				limit: JOB_CONFIG.REPEAT_LIMIT
			}
		});
	}

	async _createPriorityJob(data, index) {
		const jobName = `${JOB_TYPES.PRIORITY}-job-${index}`;
		const priority = Math.floor(Math.random() * JOB_CONFIG.MAX_PRIORITY) + JOB_CONFIG.MIN_PRIORITY;

		return await this.queue.add(jobName, {...data, priority}, {priority});
	}

	async _createFailedJob(data, index) {
		const jobName = `${JOB_TYPES.FAILED}-job-${index}`;
		const failingData = {
			...data,
			shouldFail: true,
			error: 'This job is designed to fail for testing purposes'
		};

		return await this.queue.add(jobName, failingData);
	}

	async cleanup() {
		try {
			if (this.queue) {
				await this.queue.close();
			}
			if (this.redisClient) {
				await this.redisClient.quit();
			}
		} catch (error) {
			console.error('Error during cleanup:', error.message);
		}
	}

	/**
	 * Display help information
	 */
	static showHelp() {
		const availableTypes = Object.values(JOB_TYPES).join(', ');
		const availableVersions = Object.values(QUEUE_VERSIONS).join(', ');

		console.log(`
Job Generator Script for Bull & BullMQ

Usage: node tests/job-generator.js [options]

Options:
  --version <${availableVersions}>  Specify Bull version (default: ${DEFAULTS.VERSION})
  --prefix <string>        Queue prefix (default: ${DEFAULTS.PREFIX})
  --queue <string>         Queue name (default: ${DEFAULTS.QUEUE_NAME})
  --count <number>         Number of jobs to generate (default: ${DEFAULTS.COUNT})
  --type <string>          Job type (default: ${DEFAULTS.TYPE})
                          Available types: ${availableTypes}
  --all                    Create ${DEFAULTS.COUNT} jobs of each type (overrides --type)
  --help                   Show this help message

Examples:
  node tests/job-generator.js
  node tests/job-generator.js --version bull --prefix myapp --count 10
  node tests/job-generator.js --type delayed --count 3
  node tests/job-generator.js --queue email-queue --type priority --count 5
  node tests/job-generator.js --all --count 3

Job Types Description:
  ${JOB_TYPES.DEFAULT}   - Standard jobs without special options
  ${JOB_TYPES.DELAYED}   - Jobs with execution delay (${JOB_CONFIG.DELAY_INTERVAL}ms per job)
  ${JOB_TYPES.REPEATED}  - Repeated jobs (every ${JOB_CONFIG.REPEAT_INTERVAL}ms, max ${JOB_CONFIG.REPEAT_LIMIT} times)
  ${JOB_TYPES.PRIORITY}  - Jobs with random priority (${JOB_CONFIG.MIN_PRIORITY}-${JOB_CONFIG.MAX_PRIORITY})
  ${JOB_TYPES.FAILED}    - Jobs designed to fail (for error testing)
        `);
	}
}

// Parse command line arguments
function parseArgs() {
	const args = process.argv.slice(2);
	const options = {};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--version':
				options.version = args[++i];
				break;
			case '--prefix':
				options.prefix = args[++i];
				break;
			case '--queue':
				options.queue = args[++i];
				break;
			case '--count':
				options.count = parseInt(args[++i]);
				break;
			case '--type':
				options.type = args[++i];
				break;
			case '--all':
				options.all = true;
				break;
			case '--help':
				JobGenerator.showHelp();
				process.exit(0);
				break;
		}
	}

	return options;
}

/**
 * Main execution function
 */
async function main() {
	let generator = null;

	try {
		const options = parseArgs();
		generator = new JobGenerator(options);

		const result = await generator.generateJobs();

		// Exit with error code if there were any failures
		if (result.errors && result.errors.length > 0) {
			console.error(`\n❌ Generation completed with ${result.errors.length} error(s)`);
			process.exit(1);
		}

		console.log('\n✅ All jobs generated successfully!');
		process.exit(0);

	} catch (error) {
		console.error('❌ Fatal error:', error.message);
		process.exit(1);
	} finally {
		if (generator) {
			await generator.cleanup();
		}
	}
}

// Run if called directly
if (process?.argv?.[1].endsWith('job-generator.js')) {
	main();
}
