FROM node
COPY ./app /app
RUN mdkir -p /app/uploads
WORKDIR /app
RUN npm install
EXPOSE 3000
CMD [ "node", "server.js" ]
