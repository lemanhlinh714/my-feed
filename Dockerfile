FROM node:20

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./tsconfig.json

ENV NODE_ENV production
ENV FEEDGEN_PORT=10000
ENV FEEDGEN_LISTENHOST=0.0.0.0
ENV FEEDGEN_SQLITE_LOCATION=/app/data/feed.db

EXPOSE 10000

# Use yarn to start the application
CMD ["yarn", "start"]
