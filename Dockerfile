FROM node:20-slim

# tmux for sessions; tini for proper signal handling around node-pty;
# python3/make/g++ needed only to build node-pty native bindings.
RUN apt-get update && \
    apt-get install -y --no-install-recommends tmux tini python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

# Run as non-root. UID 1000 matches the default `node` user shipped in the base image.
RUN chown -R node:node /app
USER node

EXPOSE 7681

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
