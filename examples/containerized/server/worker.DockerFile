FROM node:16.16.0 as node_build

#RUN apt-get update
#RUN apt-get install vim -y
RUN npm install pm2 -g
COPY /server/ /work/server/
WORKDIR /work/server/
RUN npm install

EXPOSE 65001
#CMD ["node","./main.js"]
CMD ["pm2-runtime", "worker.pm2.json"]