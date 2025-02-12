FROM node:23.7.0

WORKDIR /app

COPY server.ts .
COPY template.ts .
COPY public ./public

EXPOSE 5000

CMD ["node", "--experimental-strip-types", "server.ts"]
