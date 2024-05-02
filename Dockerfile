FROM node:18-alpine

USER node

ENV NODE_ENV=production \
	REDIS_HOST=localhost \
	REDIS_PORT=6379 \
	REDIS_USE_TLS=false \
	REDIS_PASSWORD='' \
	BULL_PREFIX=bull \
	BULL_VERSION=BULLMQ \
	USER_LOGIN='' \
	USER_PASSWORD='' \
	REDIS_DB=0 \
	PROXY_PATH=''

ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT

WORKDIR /home/node/

COPY --chown=node:node ./package.json .
COPY --chown=node:node ./package-lock.json .

RUN npm ci --only=production

COPY --chown=node:node ./src ./src

ENTRYPOINT ["npm"]
CMD [ "start" ]
