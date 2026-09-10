---
title: 11 ｜ 数据持久化与挂载
description: 区分 named volume 与 bind mount，通过容器重建、数据库备份和恢复验证数据路径。
date: 2026-09-09
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - Docker
  - Docker Compose
---

## 容器可以替换，数据怎么办

沿用[多服务与网络](compose-network.md)的 `delivery-demo`。同样是 volumes，`./site:/usr/share/nginx/html:ro` 和 `db-data:/var/lib/postgresql/data` 的用途不同。

| 存储位置 | 生命周期与用途 | 本例 |
| --- | --- | --- |
| 容器可写层 | 属于当前容器，删除容器后不保留其修改 | 临时文件，不作为业务数据目录 |
| named volume | Docker 管理，独立于容器 | `db-data` 保存 PostgreSQL 数据 |
| bind mount | 映射明确的宿主机路径 | `./site` 供开发时直接修改页面 |

卷的实际名称通常带项目名前缀。镜像也可能声明匿名卷，不能只看 Dockerfile 就推断数据一定在可写层；用 inspect 确认实际挂载。

## 验证重建不会删除数据

确认数据库就绪后，在 Bash 中执行：

```bash
docker compose exec -T db psql -U demo -d demo -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS course_notes (id INTEGER PRIMARY KEY, note TEXT NOT NULL);
INSERT INTO course_notes VALUES (1, 'volume survives recreation')
ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note;
SQL
docker compose up -d --force-recreate db
```

等待 `docker compose exec db pg_isready -U demo -d demo` 成功，再验证：

```bash
docker compose exec -T db psql -U demo -d demo -c 'SELECT * FROM course_notes;'
docker inspect "$(docker compose ps -q db)" --format '{{json .Mounts}}'
```

预期记录仍存在，挂载目标是 `/var/lib/postgresql/data`。数据库首次初始化后的密码保存在数据库状态中，只改 Compose 的 `POSTGRES_PASSWORD` 不会给已有账号改密码；更不能通过删除卷“修复”生产登录问题。

## bind mount 与文件权限

修改宿主机 `site/index.html` 后，再 curl 页面即可看到变化。因为目录被挂载进容器，本实验不需要重新构建镜像。

```bash
docker compose exec web sh -c 'touch /usr/share/nginx/html/should-fail'
```

预期失败，证明 `:ro` 阻止容器修改该挂载。若读取失败，检查文件权限、父目录遍历权限和容器运行用户，不统一使用 `chmod 777`。

挂载目录还会遮住镜像中相同位置的内容。后续把 site COPY 进镜像时，应移除开发用的 site 挂载，否则你可能发布了新镜像，却仍然看到宿主机旧文件。Docker Desktop 的目录共享与 Linux 原生路径也有差异，迁移时要核对。

## 备份必须通过恢复验证

本课用逻辑备份，避免直接复制正在写入的数据目录。下面只处理实验库，`backups` 中的文件也应按数据敏感性保护。

```bash
umask 077
mkdir -p backups
docker compose exec -T db pg_dump -U demo -d demo > backups/demo.sql
# 使用新的实验数据库恢复，不覆盖原库；同名库已存在时先检查其用途。
docker compose exec -T db createdb -U demo demo_restore
docker compose exec -T db psql -U demo -d demo_restore -v ON_ERROR_STOP=1 < backups/demo.sql
docker compose exec -T db psql -U demo -d demo_restore -c 'SELECT * FROM course_notes;'
```

确认恢复库中记录与原库一致，并记录耗时。卷持久化只能应对容器替换，不能应对误删、磁盘损坏或错误 SQL；正式备份还要考虑异机保存、加密、保留周期与定期恢复演练。

## 哪些命令会影响数据

| 操作 | 本例的数据卷 |
| --- | --- |
| `docker compose stop` | 保留 |
| `docker compose down` | named volume 默认保留 |
| `docker compose down -v` | 会删除项目声明的卷，不能用于日常发布 |
| `docker volume prune` | 可能清理其他项目未使用的卷，不作为本课清理方式 |

课程结束时可以执行 `docker compose down`，先保留数据用于复查。下一课将开发时的文件挂载改为镜像构建，并区分构建参数与运行时配置。

参考：[Docker volumes](https://docs.docker.com/engine/storage/volumes/)、[bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)、[PostgreSQL pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html)。
