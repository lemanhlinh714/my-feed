FROM node:22

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./tsconfig.json

RUN yarn build

ENV NODE_ENV production
ENV FEEDGEN_PORT=10000
ENV FEEDGEN_LISTENHOST=0.0.0.0
ENV FEEDGEN_SQLITE_LOCATION=/app/data/feed.db

EXPOSE 10000

CMD ["node", "dist/index.js"]
