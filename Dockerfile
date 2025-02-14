FROM node:lts-alpine3.16

RUN apk add --no-cache tini
WORKDIR /home/node/app
COPY ./package*.json ./

RUN npm ci
COPY . .
USER "node"
EXPOSE 3000

ENTRYPOINT ["tini", "--", "node", "./bin/www"]
