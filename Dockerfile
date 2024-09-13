FROM node:22-alpine3.20 as build-stage
# 作者信息
LABEL authors="xing.xiaolin@foxmail.com"

# 设置工作目录
WORKDIR /app

# 复制所有文件到工作目录
COPY . .

# 安装 pnpm
RUN npm install -g pnpm --registry=http://mirrors.cloud.tencent.com/npm/

# 安装依赖
RUN pnpm install --registry=http://mirrors.cloud.tencent.com/npm/

# 构建生产环境下到Vue项目
RUN pnpm run docs:build

FROM nginx:alpine3.20-perl

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 8080

# 启动Nginx服务
CMD ["nginx", "-g", "daemon off;"]
