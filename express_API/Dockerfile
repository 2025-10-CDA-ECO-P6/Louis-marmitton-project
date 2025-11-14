FROM node:22.14.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 1337
COPY . .
CMD ["npm", "start"]