FROM node:24-alpine3.20 AS build-stage
# 作者信息
LABEL authors="xing.xiaolin@foxmail.com"

# 构建时参数 - 百度统计 ID
ARG BAIDU_ANALYTICS_ID
ENV VITE_BAIDU_ANALYTICS_ID=${BAIDU_ANALYTICS_ID}

# 设置工作目录
WORKDIR /app

# 安装 pnpm 11.x（与当前锁文件和 node_modules 版本保持一致）
RUN npm install -g pnpm@11.1.3

# 先复制依赖清单，让文章更新复用依赖安装缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 复制站点源码（本地文件由 .dockerignore 排除）
COPY . .

# 安装Git，lastUpdated=true需要
# 使用官方 Alpine 镜像源（避免腾讯云镜像源 IO 错误）
RUN apk update \
    && apk add --no-cache bash git openssh python3

# 构建生产环境下到Vue项目
RUN pnpm run media:rewrite:apply && pnpm run docs:build



FROM nginx:alpine3.20-perl

COPY volumes/website/nginx.conf /etc/nginx/nginx.conf
COPY volumes/website/default.conf /etc/nginx/conf.d/default.conf
COPY volumes/website/nginx-stub-status.conf /etc/nginx/conf.d/nginx-stub-status.conf

COPY --from=build-stage /app/docs/.vitepress/dist /usr/share/nginx/html

# 启动Nginx服务
CMD ["nginx", "-g", "daemon off;"]
