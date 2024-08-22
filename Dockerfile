FROM node:20-alpine

USER node

ENV NODE_ENV=production

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

WORKDIR /home/node/

COPY --chown=node:node ./package.json .
COPY --chown=node:node ./package-lock.json .

RUN npm ci --only=production

COPY --chown=node:node ./src ./src

ENTRYPOINT ["npm"]
CMD [ "start" ]
