---
origin: docs/sre/devops/foundation/server-side-deploy.md
origin_url: https://xiaolinstar.cn/sre/devops/foundation/server-side-deploy.html
slug: server-side-deploy
account: AI持续运维
mode: repurpose+polish
status: ready
polish:
  - 正文从 Origin 全文同步，只移除公众号不兼容的参考区、站内链接与 VitePress 折叠块。
  - 删除正文中的站内文章导流句，并将补充视角改写为移动端友好的三点说明。
  - 将 text 架构图转为内嵌 PNG，并将二层列表扁平化为缩进说明行。
  - 精简补充视角的收尾为选型判断；不保留参考文献区。
  - 恢复补充视角的三层语义：架构特征、部署与运维差异、现状认知。
  - 用三张内嵌信息卡片呈现补充视角的层级，避免嵌套列表。
  - 将补充视角重写为「部署单元 → 两个后果 → 选型判断」的短节收束。
  - 表格采用混合排版：短表压缩为固定列宽，高密度表转换为纵向信息卡片。
  - 公众号稿取消全部 HTML 表格，统一使用紧凑纵向对照卡片，规避移动端换行差异。
  - 保留 Spring Boot、Flask 与 systemd 的裸机部署主线
  - 将站内链接、参考文献和 Mermaid 图改为公众号兼容表达
  - 按微信编辑器兼容规则输出公式、代码块与列表
---

# 发布元数据

## 标题备选（人工筛选）

1. DevOps 基础 03 ｜ 服务端应用部署：依赖、运行时与进程保活（系列化）
2. 静态网站能上线，后端服务为什么还要管“保活”？
3. Spring Boot、Flask 上服务器后，最容易漏掉的 3 件事

**选用**：1

## 摘要（120 字）

静态网站上线后，真正麻烦的是后端服务：它有运行时、依赖和必须长期存活的进程。本文以 Spring Boot 与 Flask 为例，拆解构建位置、进程保活和多组件依赖三类问题，并用 systemd 跑通裸机部署的最小验证闭环，也为容器化铺路。

## 搜索关键词（4 个）

服务端部署、Spring Boot 部署、systemd 进程保活、Flask Gunicorn

---

# 正文（粘贴到公众号后台）

前两篇处理的对象都是“一堆 HTML / CSS / JS”。构建产物是静态文件，部署动作是把文件放进 Nginx 目录，服务器只需执行“读文件 → 返回”。

但真实业务不只有静态展示。用户登录、购物车、订单支付、数据统计，都需要执行业务代码、读写数据库、记录会话状态。这一层不在浏览器里运行，而是以**后端 API 进程**的形态常驻在服务器上。

```text
浏览器 / 客户端（发起请求）
    ↓ HTTP
Nginx（公网入口，80/443）
    ↓ 反向代理
Java / Python 进程（8080/8000，处理业务 API）
    ↓ 读写
MySQL / Redis / Kafka（数据持久化与中间件）
```

这篇要处理的跃迁是：当部署对象从“纯静态文件”升级为带运行时、第三方依赖和监听端口的后端 API 进程时，前两篇的部署方式哪里还不够？

问题可以拆成两件事：

1. 在哪构建：服务器构建，还是本地构建后传产物？
2. 在哪运行：怎样让后端 API 脱离终端、24 小时常驻，并在故障时自动拉起？

## 架构演进：静态资源与动态资源

前两篇里“处理请求并返回响应”的角色一直都在，它叫 Nginx。它默认监听 80 / 443 端口：要么直接读静态文件，要么替后端接收公网请求，再反向代理到内部端口。

```text
前端：浏览器 → Nginx(:80/443) → 读 dist/ 文件 → 返回 HTML / CSS / JS
后端：浏览器 → Nginx(:80/443) → 反代到 :8080 → Java / Python 进程 → 返回 JSON
```

客户端只与 Nginx 通信，通常不知道后端端口。后端进程死掉时，Nginx 仍在，但会向用户返回 `502 Bad Gateway`；入口可达，真正故障的是上游应用。

| 维度 | 前端部署（静态） | 后端部署（动态 API） |
| --- | --- | --- |
| 部署对象 | `dist/` 纯文件载荷 | jar / wheel + JVM / Python 等运行时 |
| 服务进程 | Nginx 读静态文件 | Tomcat / Gunicorn 跑业务代码 |
| 部署动作 | `scp` 文件到 Nginx 目录 | 上传产物 + 拉起进程 + 监听端口 |
| 故障感知 | Nginx 挂了，连接被拒绝 | 后端挂了，Nginx 返回 502 |

后端比前端多出一层：除了 Web 服务器，还要面对 `pom.xml` / `pyproject.toml` 的业务依赖，以及运行时本身。部署对象从纯文件层抬升到带运行时层，保活与依赖治理也随之出现。

### Spring Boot 与 Flask 两个典型栈

**Spring Boot** 常见启动命令是 `java -jar app.jar`，内嵌 Tomcat 默认监听 8080。fat jar 会携带多数 Java 依赖，跨机器传输相对方便；但 JVM 启动时间、堆内存和 GC 都是实际运行时约束。

**Flask** 在本地可用 `python app.py`，生产环境应由 `gunicorn app:app` 承担服务。它轻量、上手快，但 Python 解释器、系统库和 C 扩展会让跨机器部署更容易踩坑。

## 构建放在哪里：两条路线，两个坑

**路线 A：服务器构建。** `git pull` 源码后，在服务器执行 `mvn package` 或 `pip install`。好处是构建环境与运行环境同机；代价是服务器需要安装 JDK、Maven、Python、gcc 等工具，慢慢变成另一台开发机。

**路线 B：本地构建后传产物。** 本地打出 jar 或 wheel，再上传到服务器。Spring Boot 的 fat jar 相对干净，但 Flask 的带 C 扩展依赖可能是为 macOS 编译的 `.so`，上传到 Linux 后会遇到 `GLIBC not found` 一类错误。

![两类构建部署路线对比](https://media.xiaolin.fun/docs/img-server-side-deploy/diagram-build-route-a-vs-b.png)

两条路线都不是银弹。共同根源是：我们通常只传了代码和依赖，却没有把**运行环境本身**带过去。

### 三类容易被低估的运维痛点

1. **服务器会变脏。** 服务器构建会不断安装 Java、Maven、Python、Node；半年后本地升级到 Java 21，服务器仍是 Java 11，又多一处版本错位。
2. **构建是重资源任务。** 编译、链接和依赖安装都吃 CPU 与内存；线上服务与构建共用一台机器时，响应可能变慢，甚至触发 OOM。
3. **网络环境不对等。** 本地能顺畅访问的仓库，云服务器未必能访问；没有镜像源或私有仓库时，在线拉依赖往往又慢又不稳定。

![三类运维痛点汇总](https://media.xiaolin.fun/docs/img-server-side-deploy/diagram-three-pain-points.png)

这三类问题最终都会指向**低可移植性**：构建动作与运行环境割裂，产物离开特定机器就可能遇到环境漂移。后续容器化会把“代码 + 依赖 + 运行时”打包为镜像；而在这一篇，我们先把裸机运行的基本功跑通。

## 进程生命周期：从前台调试到后台运行

后端进程不是“调试一次，按 Ctrl+C 退出”的开发期任务。它要长期监听端口、写日志，并能在异常时恢复。

```bash
# Spring Boot（通常监听 8080）
java -jar app.jar

# Flask：生产使用 Gunicorn；前置 Nginx 时只绑定本机回环地址
gunicorn -w 4 -b 127.0.0.1:8000 app:app
```

先理解三种启动层级：

```bash
# 1. 前台调试：终端关了就退出
java -jar app.jar

# 2. 临时后台：终端关了仍在跑，日志默认落到 nohup.out
nohup java -jar app.jar &

# 3. 指定日志位置的临时后台
nohup java -jar app.jar > /var/log/myapp.log 2>&1 &
```

这并不是最终方案。`nohup` 只能让进程暂时脱离当前终端，服务器重启后它不会自己回来。生产环境至少要有“启动 → 验证 → 看日志 → 失败后重试”的闭环：

1. 启动 Spring Boot 或 Gunicorn；
2. 用 `ps` 确认进程仍在；
3. 用本机 `curl` 验证端口；
4. 出现 502 或进程消失时，查看日志后重新拉起。

```bash
# 1. 验证进程在跑
ps -ef | grep java
ps -ef | grep gunicorn

# 2. 验证端口与健康检查
curl -I http://127.0.0.1:8080
curl -I http://127.0.0.1:8000

# 3. 排查日志
journalctl -u myapp -n 100 -f
tail -f /var/log/myapp.log
```

## 生产级保活：交给 systemd

裸机上，把服务注册为 systemd unit 才是生产级保活。将下面内容保存为 `/etc/systemd/system/myapp.service`：

```ini
[Unit]
Description=My Spring Boot Application
After=network.target

[Service]
User=ubuntu
ExecStart=/usr/bin/java -jar /opt/myapp/app.jar
Restart=on-failure
RestartSec=5
Environment=SPRING_PROFILES=prod

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
sudo systemctl status myapp
```

`systemctl enable` 解决的是“服务器重启后谁来拉起服务”；`Restart=on-failure` 解决的是“进程异常退出后谁来重启”。Flask 配合 Gunicorn 的 unit 结构相同，只需替换 `ExecStart`。

## 应用不是孤岛：最小生产组合

真实服务端通常至少有三类常驻对象：Nginx 负责公网入口与静态文件；Spring Boot / Flask 负责业务 API；MySQL / PostgreSQL 负责数据落盘。

```text
公网用户 → Nginx（80/443）
              ├─ 读 dist/ 静态文件
              └─ 反代 /api → Spring Boot / Flask（8080/8000）
                                  └─ 连接 MySQL / PostgreSQL（3306/5432）
```

当应用和数据库同时存在，手动运维会立即增加四类工作：安装初始化数据库、保证“数据库先就绪再启动应用”、处理多版本与端口冲突、以及在不用时清理散落在系统里的配置和数据。

这类靠记忆执行的重复劳动，在 SRE 语境中就是高运维苦工。它也是下一阶段引入 Docker 与 Docker Compose 的原因：一个解决单组件的运行环境封装，一个解决多组件的声明式编排。

## 回到第 02 篇：发布 DAG 在服务端如何变化

第 02 篇的静态发布可以看作一条线性链：

$$
v_{build} → v_{upload} → v_{verify}
$$

服务端引入编译、常驻进程和数据库后，操作被分成两段：构建阶段与生产运行阶段。

$$
V_{build} = {v_{pull}, v_{compile}}
$$

$$
V_{run} = {v_{db}, v_{app}, v_{reload}, v_{verify}}
$$

关键依赖是数据库先就绪，再启动应用：

$$
v_{db} → v_{app}
$$

终点验证也不再只有一次公网访问，而是两层检查：先确认 `systemctl status myapp` 和本机 `curl` 正常，再从公网请求 API，确认 Nginx 反代没有返回 502。两层都通过，发布才算真正完成。

## 小结

从系统运行时与服务进程的角度看，一台典型服务器上会同时存在 Nginx、应用进程和数据库进程。静态资源 `dist/` 并不是独立进程，而是由 Nginx 直接读取的文件资产。

前端与后端的链路结构并没有变，仍是“用户 → Nginx → 处理 → 返回”；变化的是后端需要额外管理**进程生命周期**和**进程保活**。前端 `dist/` 可以直接上传，后端 jar 或 Python 依赖却仍受运行环境约束。

我的判断是：理解 systemd 并不是为了永远手写 unit 文件，而是为了先看清裸机部署到底在管理什么。下一步再引入 Docker 时，才能真正理解“服务器只跑进程、不再装包”解决了什么问题。

## 思考

1. Flask 的 `python app.py` 启动的是开发服务器。它为什么不适合作为生产服务？Gunicorn 或 Uvicorn 补上了什么能力？
2. 服务器执行 `pip install psycopg2` 后提示缺少 `libpq-dev`，这暴露的是构建位置问题，还是运行环境问题？
3. `nohup java -jar app.jar &` 与 `systemctl start myapp` 有什么差别？服务器重启后，谁会活下来？
4. 相比静态资源部署，这一篇新增了哪些进程生命周期管理动作？

## 延伸阅读：Nginx 的两个角色

在前后端分离架构中，Nginx 同时承担两件事：作为 Web 服务器读取静态文件；作为反向代理把 API 请求转给后端，并通过同域入口收敛跨域问题。

| 角色 | 承担者 | 职责 |
| --- | --- | --- |
| Web 服务器（静态） | CDN / Nginx / Apache | 只读静态文件 |
| 反向代理 / 软负载 | Nginx / Envoy / HAProxy | 流量转发与同域收敛 |
| 业务服务 | Spring Boot / Flask | 执行业务逻辑 |

对个人开发者与中小项目，一个 Nginx 同时承担这两个角色通常足够务实；规模扩大后，再按职责拆分与独立扩容。

---

# 发布 checklist

- [ ] 标题已单独填入公众号后台：DevOps 基础 03 ｜ 服务端应用部署：依赖、运行时与进程保活
- [ ] 摘要已填入公众号后台
- [ ] 正文图片已确认可直接粘贴
- [ ] 封面图已上传
- [ ] 后台手机端预览排版正常
- [ ] 公众号名片已插入文末
- [ ] meta.yaml → platforms.wechat.status: published

## 封面图

封面文件：`docs/public/images/img-server-side-deploy/03-wechat-cover.png`，尺寸 `900×383`，公众号后台请单独上传。
