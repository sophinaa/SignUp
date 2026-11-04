FROM node:22-alpine
WORKDIR /app
ENV DATA_DIR=/data PORT=3000
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["npm", "start"]
