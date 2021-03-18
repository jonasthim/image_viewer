FROM node
COPY ./app /app
WORKDIR /app
RUN npm install
EXPOSE 8080
CMD [ "node", "server.js" ]
