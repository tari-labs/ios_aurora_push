FROM node:13.8-slim

WORKDIR /home/node/app
COPY ./package*.json ./
RUN npm install
COPY . .
USER "node"
EXPOSE 3000
CMD [ "npm", "run", "start" ]
