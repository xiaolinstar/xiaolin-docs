# VitePress快速搭建个人网站

> 本文介绍VitePress搭建个人网站，并使用Docker容器化部署。

## 安装

安装步骤概述：

1. 前置准备：宿主机安装docker、node等开发环境
2. 安装向导：基于VitePress脚手架初始化项目
3. 运行启动：打包镜像并运行容器

### 前置准备

- Node.js 18及以上版本
- Docker:
    - Mac、Windows: [Docker Desktop](https://www.docker.com/)
    - Linux: [Ubuntu、Debain等](https://docs.docker.com/desktop/install/linux/)
- 命令行终端（Windows Powershell、MacOS终端）
- 开发集成环境（IDE）: VSCode、Webstorm

在项目文件夹中（推荐VscodeProjects或WebstormProjects）创建空项目文件夹`docker-vitepress`

```shell
mkdir docker-vitepress && cd docker-vitepress
```

推荐使用pnpm安装VitePress

```shell
# 安装pnpm
npm install -g pnpm@latest
# 安装vitepress
pnpm add -D vitepress
```

### 安装向导

VitePress附带一个命令行设置向导，可以帮助你构建一个基本项目。安装后，通过运行以下命令启动向导

```shell
pnpm vitepress init
```

根据命令提示，初始化项目

```shell
┌  Welcome to VitePress!
│
◇  Where should VitePress initialize the config?
│  ./docs
│
◇  Site title:
│  My Awesome Project
│
◇  Site description:
│  A VitePress Site
│
◇  Theme:
│  Default Theme
│
◇  Use TypeScript for config and theme files?
│  Yes
│
◇  Add VitePress npm scripts to package.json?
│  Yes
│
└  Done! Now run pnpm run docs:dev and start writing.
```

安装后项，目录结构下图所示：

```shell
.
├── README.md
├── docs
│    ├── api-examples.md
│    ├── index.md
│    └── markdown-examples.md
├── node_modules
│    └── vitepress -> .pnpm/vitepress@1.3.4_@algolia+client-search@4.24.0_postcss@8.4.47_search-insights@2.17.2/node_modules/vitepress
├── package.json
└── pnpm-lock.yaml

```

### 运行启动

查看package.json下启动脚本

```json
{
  "devDependencies": {
    "vitepress": "^1.3.4"
  },
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

项目根目录启动终端，执行

```shell
# vitepress docs:dev
pnpm run docs:dev
```

根据提示，在浏览器中打开：[http://localhost:5173/](http://localhost:5173/)

项目停止

```shell
# MacOS
Command+C
# Windows
Ctrl+C
```

容器打包，将在`docs/.vitepress`下生成dist包，该包用于在生产环境部署

```shell
# vitepress docs:build
pnpm run docs:build
```

## 容器化部署

前端资源在生产环境中部署时，将源文件打包为`dist`，然后`nginx`作为Web服务器对静态资源代理。简而言之，在生产环境，`dist`+`nginx`可以实现前端部署。

### 容器化

**创建`nginx`配置文件`nginx.conf`**

```nginx
server {
    listen       8080;
    listen  [::]:8080;
    server_name localhost;

    access_log  /var/log/nginx/host.access.log  main;

    # 静态资源代理，前端Web服务器
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    #error_page  404              /404.html;

    # redirect server error pages to the assets page /50x.html
    #
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

**项目根目录下新建`Dockerfile`**

```shell
touch Dockerfile
```

粘贴如下`Dockerfile`模板，根据个人信息更改部分内容。安装`npm`和`pnpm`时默认使用腾讯云资源镜像加速，如果你在阿里云或华为云上部署该项目，若容器构建失败请更改资源镜像。

```dockerfile
FROM node:22-alpine3.20 as build-stage
# 作者信息
LABEL authors="test@test.com"

# 设置工作目录
WORKDIR /app

# 复制所有文件到工作目录
COPY . .

# 安装 pnpm Qcloud腾讯云加速
RUN npm install -g pnpm --registry=http://mirrors.cloud.tencent.com/npm/

# 安装依赖 Qcloud腾讯云加速
RUN pnpm install --registry=http://mirrors.cloud.tencent.com/npm/

# 构建生产环境下到Vue项目
RUN pnpm run docs:build

FROM nginx:alpine3.20-perl

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build-stage /app/docs/.vitepress/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 8080

# 启动Nginx服务
CMD ["nginx", "-g", "daemon off;"]
```

容器构建，并将容器命名为`my-vitepress/hello:0.0.1`

```shell
docker build -t my-vitepress/hello:0.0.1 .
```

完成一个VitePress Docker容器的构建，查看镜像

```shell
docker ps | grep hello:0.0.1
```

创建并运行容器（以下两种方式任选其一）

---

docker直接运行

```shell
# 将vitepress/hello:0.0.1作为镜像启动容器，以后台方式运行，映射本地端口80，容器命名为my-vitepress
docker run -d --name vitepress-test -p 80:8080 my-vitepress/hello:0.0.1
```

停止容器

```shell
docker stop vitepress-test
```

删除容器

```shell
docker rm vitepress-test
```

---

docker-compose构建并运行，需创建`docker-compose.yaml`配置文件。（也支持自定义文件名，使用`-f docker-compose-local.yaml`指定该配置）

```shell
# docker compose up -d 
docker-compose up -d
```

停止容器并卸载

```shell
# docker compose down
docker-compose down
```

---

在浏览器中打开 [http://localhost](http://localhost)（http默认端口号为80） 即可查看部署效果。

## Workflow项目托管

> 将项目托管到GitHub，方便项目分发。任何拥有Docker环境的服务器都可以快速部署该项目。

将本项目托管到[GitHub](https://github.com/)或[Gitee](https://gitee.com)（码云，GitHub国内版），以GitHub为例

### 注册并登录GitHub

> 过程概述，详细过程略

项目托管建议参考GitHub官方文档[Get started](https://docs.github.com/zh/get-started/start-your-journey/about-github-and-git)

1. 注册并登录：[https://github.com/](https://github.com/)
2. 设置github-ssh密钥，将公钥添加到GitHub设置中密钥中
3. 创建项目仓库： `docker-vitepress`
4. 本地git仓库与GitHub仓库关联，推送本地项目

### 创建.gitignore

```shell
touch .gitignore
```

在git仓库中忽略本地IDE配置文件，以及build后生成的包

```
docs/.vitepress/cache
docs/.vitepress/dist/
node_modules
# Jetbrains软件配置文件
.idea
```


### GitHub Actions-Workflow配置文件

在该项目的GitHub仓库Settings中配置仓库密钥

1. Settings
2. Security -> Secrets and variables -> Actions
3. 创建新的仓库密钥： New repository secret
4. 密钥命名为`VITE_TOKEN`，密钥为上一小节中获取的一串TOKEN

更新本项目中的`github-actions.yaml`中个性化参数

```yaml
token: ${{secrets.VITE_TOKEN}}
git-config-name: GitHub用户名
git-config-email: GitHub用户邮箱
```

```yaml
# 部分内容
name: Deploy 🚀
  uses: JamesIves/github-pages-deploy-action@v4
  with:
  token: ${{secrets.VITE_TOKEN}}
  folder: docs/.vitepress/dist
  git-config-name: xiaolinstar
  git-config-email: xing.xiaolin@foxmail.com
```

`push`到GitHub仓库后，会自动触发GitHub Actions；

`workflow_dispatch`支持「点击按钮」手动触发。

### 添加域名前缀

GitHub Actions部署和普通云服务器部署域名区别：

- 云服务域名：`http://vitepress-qucikstart`或`https://vitepress-quickstart`
- GitHub域名：`https://xiaolinstar.github.io/docker-vitepress/`

GitHub部署方式比云服务器部署多了仓库名前缀，需要在项目部署时做区分和处理，以兼容这两类部署方式。

VitePress项目的主要配置文件包括两个：

- docs/index.md
- docs/.vitepress/config.mts

只需在`config.mts`中添加2行代码即可区分项目部署方式。 修改后的`config.mts`内容如下（添加的代码以用注释标注）

```ts
import { defineConfig } from 'vitepress'

// @ts-ignore (*) 网站基础路径，区分GitHub部署和常规部署
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/docker-vitepress/' : '/'

// https://vitepress.dev/reference/site-config
export default defineConfig({
   base: basePath, // (*) 设置域名前缀
   title: "My Awesome Project",
   description: "A VitePress Site",
   themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      nav: [
         { text: 'Home', link: '/' },
         { text: 'Examples', link: '/markdown-examples' }
      ],

      sidebar: [
         {
            text: 'Examples',
            items: [
               { text: 'Markdown Examples', link: '/markdown-examples' },
               { text: 'Runtime API Examples', link: '/api-examples' }
            ]
         }
      ],

      socialLinks: [
         { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
      ]
   }
})

```

## 项目维护

### 文章创作

本项目使用`markdown`语法来编写文档。用户的创作行为都应在IDE集成工具（如WebStorm）中完成：

- 新建文章：
    1. 在`docs`目录下新建`md`格式的文本，如`hello.md`，进行内容创作
    2. 在`docs/.vitepress/config.mts`中创建项目配置
- 修改文章：直接修改原文档即可
- 删除文章：
    1. 删除`docs`目录下的指定文档
    2. 修改`docs/.vitepress/config.mts`中的文章配置，避免出现404


### 网站更新

在文章创作后，将「变化」部署到项目网站中，开发环境中测试：

```shell
pnpm run docs:dev
```

项目推送`push`到GitHub，在仓库中的Actions中查看变更。

## 下一步工作

想要持续维护该项目或打造个性化网站，请参考VitePress官方文档：[VitePress](https://vitepress.dev/zh/)

## References

[1]. VitePress由Vite和Vue驱动的静态站点生成器，https://vitepress.dev/zh/

[2]. Git started，开始你的旅程，https://docs.github.com/zh/get-started/start-your-journey/about-github-and-git

[3]. GitHub Actions，https://docs.github.com/zh/actions/writing-workflows/quickstart

[4]. GitHub Pages，https://docs.github.com/zh/pages

[5]. Gitee，https://gitee.com

## 联系作者

如果您有需要技术咨询，或者有想法使本文档变得更好。

联系作者：xing.xiaolin@foxmail.com

