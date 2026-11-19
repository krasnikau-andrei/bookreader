FROM oven/bun:1-alpine
WORKDIR /app
COPY src ./src
ENV PORT=8787 DB_PATH=/data/reading-together.sqlite
VOLUME /data
EXPOSE 8787
CMD ["bun", "run", "src/main.ts"]
