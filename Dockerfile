FROM node:lts-alpine3.14


WORKDIR /home/node/app
COPY ./package*.json ./
RUN npm install
COPY . .
USER "node"
EXPOSE 4000
CMD [ "npm", "run", "start" ]
