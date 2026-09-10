---
title: 14 ｜ 健康检查与启动依赖
description: 验证启动、就绪、健康状态和重启策略，建立自动发布前的验收标准。
date: 2026-09-09
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
---

## 容器启动成功不代表服务可用

前几课已经知道网络、数据和配置在哪里。现在要回答发布时最常见的问题：`up -d` 已经返回，数据库为什么还连不上？

本课继续使用本地 `delivery-demo` Compose 项目。先把环境变量恢复到第 12 课完整配置，确认 web 使用自己的镜像、db 保留原数据卷。

## 给依赖定义可检查的状态

将以下字段合并到现有 web 和 db 服务。它是 **局部补充**，不要删除原来的镜像、环境变量、挂载和网络配置：

```yaml
services:
  web:
    healthcheck:
      test: [CMD-SHELL, "wget -q -O - http://127.0.0.1/healthz | grep -qx ok"]
      interval: 5s
      timeout: 3s
      retries: 3
      start_period: 5s
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
  db:
    healthcheck:
      test: [CMD-SHELL, 'pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"']
      interval: 3s
      timeout: 3s
      retries: 10
      start_period: 10s
    restart: unless-stopped
```

`$$` 阻止 Compose 提前插值，使变量留给容器内 shell 展开。`CMD-SHELL` 会调用容器内 shell；`CMD` 则直接执行参数，不自动展开管道和变量。探针工具必须存在于镜像中。

本例静态页面并不依赖数据库业务，增加依赖是为了演示等待机制；实际项目只声明真实依赖，不人为扩大故障影响范围。`pg_isready` 检查服务是否接受连接，不等于验证业务账号权限和 SQL 结果。

## 等待就绪，再记录成功

需要支持 `--wait` 的 Compose v2；先用 `docker compose up --help` 核对当前版本。

```bash
docker compose config --quiet
docker compose up -d --wait --wait-timeout 90
docker compose ps
curl --fail http://127.0.0.1:18080/healthz
docker inspect "$(docker compose ps -q web)" --format '{{json .State.Health}}'
```

成功条件是依赖健康、web 健康，并且入口返回 `ok`。这里检查的是容器内部与宿主机入口两条路径；远端发布还需从实际访问方检查公网入口、TLS 和业务接口。

`start_period` 是启动宽限期，不是固定睡眠；失败累计、超时和检查间隔共同决定判定时间。不要无限拉长参数来掩盖服务起不来的问题。

## 故意让健康检查失败

临时将 web 的检查替换为始终失败的命令，其他配置保持不变：

```yaml
healthcheck:
  test: [CMD, "false"]
  interval: 2s
  timeout: 1s
  retries: 2
  start_period: 0s
```

```bash
docker compose up -d --wait --wait-timeout 20 web
docker compose ps
docker inspect "$(docker compose ps -q web)" --format '{{.RestartCount}} {{.State.Health.Status}}'
```

第一条应以非零退出码结束，但 web 的主进程仍可能运行。状态变为 unhealthy 不会仅因为 `restart: unless-stopped` 就自动重启；重启策略主要处理容器进程退出。

恢复原健康检查，再执行 `up -d --wait`。确认状态恢复，并保存失败和恢复的检查输出。

## depends_on 的边界

`condition: service_healthy` 在启动依赖时等待条件成立，不是长期的依赖守护器。数据库在运行途中故障，Compose 不会自动让应用具备重连、业务降级和事务补偿。

| 情况 | 需要什么机制 |
| --- | --- |
| 数据库初始化较慢 | 就绪探针与启动等待 |
| 应用运行中连接断开 | 应用重试、退避和超时 |
| 进程异常退出 | 合适的 restart 策略与日志排查 |
| 进程存活但业务错误 | 业务探测、告警与恢复流程 |

手动停止与进程意外退出的处理也不同；不要用“stop 后没自动重启”证明策略失效。

## 进入流水线之前的验收

让一次健康检查失败产生非零退出码，同时保留日志；恢复正确配置后再次验证成功。后续流水线只需调用这些可检查的步骤，而不靠固定 `sleep 30` 或“命令已经执行完”判断发布成功。

下一课从[制品仓库](13-image-registry.md)的交接关系出发解释 [CI/CD 分离](cicd-separation.md)，再分别实现构建与发布流水线。

参考：[Compose 启动依赖](https://docs.docker.com/compose/how-tos/startup-order/)、[重启策略](https://docs.docker.com/engine/containers/start-containers-automatically/)。
