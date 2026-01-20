FROM node:18-slim AS build
WORKDIR /app

ENV REACT_APP_ENV=prod

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
# RUN npm run build
RUN npm run build || (echo "======= BUILD FAILED =======" && ls -al && cat dist/index.html || true && exit 1)

# ------------------------------------------------

FROM nginx:alpine
# 빌드 결과 복사
COPY --from=build /app/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]