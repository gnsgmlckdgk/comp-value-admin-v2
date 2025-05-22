FROM node:18 AS build
WORKDIR /app

ENV REACT_APP_ENV=prod

COPY package*.json ./
RUN npm ci

COPY . .
# RUN npm run build
RUN echo "------ ENV DUMP ------" && cat .env && env | grep REACT_APP && npm run build

# ------------------------------------------------

FROM nginx:alpine
# 빌드 결과 복사
COPY --from=build /app/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]