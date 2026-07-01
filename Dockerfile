FROM oven/bun:latest

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
