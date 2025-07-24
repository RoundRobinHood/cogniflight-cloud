# Base stage
FROM node:24 AS development

WORKDIR /app
COPY . .

ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

ARG API_PREFIX=/api
ENV VITE_API_PREFIX=$API_PREFIX

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev"]

# Build stage (only needed for prod)
FROM development as build

ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

ARG API_PREFIX=/api
ENV VITE_API_PREFIX=$API_PREFIX

RUN npx vite build

# Static folder hosting for prod
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
