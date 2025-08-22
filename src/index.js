import passport from 'passport';
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { ensureLoggedIn } from 'connect-ensure-login';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import {config} from "./config.js";
import {authRouter} from './login.js';
import {router} from "./bull.js";
import {client} from "./redis.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

if (app.get('env') !== 'production') {
	const morgan = await import('morgan');
	app.use(morgan.default('combined'));
}

app.use((req, res, next) => {
	if (config.PROXY_PATH) {
		req.proxyUrl = config.PROXY_PATH;
	}
	next();
});

const sessionOpts = {
	name: 'bull-board.sid',
	secret: Math.random().toString(),
	resave: false,
	saveUninitialized: false,
	cookie: {
		path: '/',
		httpOnly: false,
		secure: false
	}
};

app.use(session(sessionOpts));
app.use(passport.initialize({}));
app.use(passport.session({}));
app.use(bodyParser.urlencoded({extended: false}));

if (config.AUTH_ENABLED) {
	app.use(config.LOGIN_PAGE, authRouter);
	app.use(config.HOME_PAGE, ensureLoggedIn(config.LOGIN_PAGE), router);
} else {
	app.use(config.HOME_PAGE, router);
}

app.use('/healthcheck', async (req, res) => {
	let status = "ok", redisStatus, redisError;

	try {
		 if (await client.ping() === "PONG") {
			 redisStatus = 'up';
		 } else {
			 redisStatus = 'down';
			 status = "error";
		 }
	} catch (err) {
		console.error(err)
		status = "error";
		redisError = err;
	}

	res.status(200).json({
		status,
		info: {
			redis: {
				status: redisStatus,
				description: "Based on the Redis PING/PONG system",
				...(redisError && { error: redisError.message})
			},
		},
	});
});

app.listen(config.PORT, config.BULL_BOARD_HOSTNAME, () => {
	console.log(`bull-board is started http://${config.BULL_BOARD_HOSTNAME}:${config.PORT}${config.HOME_PAGE}`);
	console.log(`bull-board is fetching queue list, please wait...`);
});
