FROM mcr.microsoft.com/playwright:v1.62.1-noble
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm run build
RUN mkdir -p /app/uploads && chown -R pwuser:pwuser /app
USER pwuser
EXPOSE 3000
CMD ["node", "dist/src/server.js"]
