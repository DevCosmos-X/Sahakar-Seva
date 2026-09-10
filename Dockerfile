# syntax=docker/dockerfile:1
#
# Dev image for the SahakarSevaMobile React Native JavaScript toolchain.
#
# OPTION A — dependencies are BAKED INTO THE IMAGE. A fresh clone needs only:
#     docker compose build          # installs deps into the image (cached after first run)
#     docker compose up metro       # starts the bundler — no separate `npm install`
#
# IMPORTANT — what this container CAN and CANNOT do:
#   CAN:    run the Metro bundler, ESLint, Jest, and any pure-JS tooling.
#   CANNOT: build/run the native Android app (gradlew) or talk to a USB device / emulator.
#           Those need the Android SDK + adb + host USB/GPU access, which don't cross the
#           Windows container boundary. Keep running `npx react-native run-android` /
#           `gradlew` on the HOST; point the app at Metro on host port 8081.
#
# Node pinned to 22 to satisfy package.json "engines": { "node": ">= 22.11.0" }.

FROM node:22-bookworm

ENV NODE_ENV=development \
    # Let Metro be reached from outside the container.
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

WORKDIR /app

# Watchman/git make Metro's file watching more reliable on large trees.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# --- Dependency layer (baked into the image) ---------------------------------
# Copy only the manifests first so this layer is cached and only re-runs when the
# dependency set actually changes.
COPY package.json package-lock.json ./

# `postinstall` runs patch-package, which reads a top-level `patches/` folder. Copy it so any
# patches apply during the image build. The folder is committed (with a .gitkeep) so this COPY
# always resolves; an empty folder simply means "no patches", which is valid.
COPY patches ./patches

# Install EXACTLY the locked dependency tree into the image. `npm ci` is reproducible and fails
# if package-lock.json is out of sync — ideal for a build that others will rely on.
RUN npm ci

# Copy the application source INTO the image as well. Baking both deps and source makes the
# "clone -> build -> run" path fully self-contained and avoids the Windows-Docker pitfall where a
# bind mount over /app hides the image's node_modules. (.dockerignore keeps host node_modules and
# native build output out of this copy.) For live-editing, see the bind-mount note in
# docker-compose.yml.
COPY . .

# Metro dev server port.
EXPOSE 8081

# Default command starts Metro bound to all interfaces so the host device can reach it.
CMD ["npx", "react-native", "start", "--host", "0.0.0.0"]
