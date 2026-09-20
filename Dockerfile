FROM node:22-alpine

WORKDIR /app

# Copy dependency specifications and app sources
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD [node, server/server.js]
