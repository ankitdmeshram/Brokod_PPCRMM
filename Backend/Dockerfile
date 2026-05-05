FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5000

FROM base AS dev

ENV NODE_ENV=development

CMD ["npm", "run", "dev"]

FROM base AS prod

ENV NODE_ENV=production

CMD ["npm", "start"]
