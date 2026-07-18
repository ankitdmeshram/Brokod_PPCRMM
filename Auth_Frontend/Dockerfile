FROM node:22-alpine AS dev

WORKDIR /app

ARG VITE_API_DOMAIN=
ARG VITE_BASE_PATH=/auth/
ARG VITE_PRODUCT_APP_PATH=/projects/workspace
ENV VITE_API_DOMAIN=$VITE_API_DOMAIN
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_PRODUCT_APP_PATH=$VITE_PRODUCT_APP_PATH

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]

FROM dev AS build

RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
