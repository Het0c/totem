FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_OCTOPRINT_URL=/octoprint
ARG VITE_OCTOPRINT_ID=octoprint-debug
ARG VITE_OCTOPRINT_NAME="OctoPrint Debug"
ENV VITE_OCTOPRINT_URL=${VITE_OCTOPRINT_URL}
ENV VITE_OCTOPRINT_ID=${VITE_OCTOPRINT_ID}
ENV VITE_OCTOPRINT_NAME=${VITE_OCTOPRINT_NAME}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

ENV OCTOPRINT_URL=http://172.17.0.1:5000
ENV OCTOPRINT_API_KEY=""

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
