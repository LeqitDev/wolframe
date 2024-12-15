# syntax=docker/dockerfile:1.7-labs

FROM rust:latest AS wasm
WORKDIR /usr/src/wasm
COPY ./typst-flow-wasm /usr/src/wasm

RUN cd /usr/src/wasm
RUN apt-get update && apt-get install -y
RUN rustup target add wasm32-unknown-unknown
RUN cargo install wasm-pack
RUN wasm-pack build --target web

# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
ARG DATABASE_URL
ARG MINIO_USER
ARG MINIO_PW
ARG MINIO_ENDPOINT
ARG MINIO_PORT
ARG MINIO_BUCKET
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=wasm /usr/src/wasm/pkg ./typst-flow-wasm/pkg
COPY --exclude=typst-flow-wasm . .

# [optional] tests & build
ENV NODE_ENV=production
ENV DATABASE_URL=$DATABASE_URL
ENV MINIO_USER=$MINIO_USER
ENV MINIO_PW=$MINIO_PW
ENV MINIO_ENDPOINT=$MINIO_ENDPOINT
ENV MINIO_PORT=$MINIO_PORT
ENV MINIO_BUCKET=$MINIO_BUCKET
RUN bun test
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/build build
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "./build" ]