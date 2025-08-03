# Base stage
FROM node:24 AS development

WORKDIR /app
COPY . .

ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

ARG API_PREFIX=/api
ENV VITE_API_PREFIX=$API_PREFIX

RUN npm install && npm run build

EXPOSE 1024

CMD ["npm", "run", "dev"]

# Static folder hosting for prod
FROM nginx:alpine AS production

COPY --from=development /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 1024

CMD ["nginx", "-g", "daemon off;"]
