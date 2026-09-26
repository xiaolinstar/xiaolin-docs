---
title: 22 ｜ 数据库迁移与发布兼容性
description: 用 PostgreSQL 与 Flyway 验证迁移历史、兼容性扩展和失败恢复。
date: 2026-09-08
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - 数据库
  - Flyway
  - Liquibase
---

## 应用回退不等于数据恢复

镜像可以切回旧版，但删除的数据不会随之恢复。本课给 `delivery-demo` 发布包增加独立的数据库迁移组件。静态站点尚不访问数据库，因此数据库验收单独执行 SQL，结课项目也保留这一边界。

主线选 Flyway，使用本地 Docker Compose 和 PostgreSQL 16；Liquibase 放在最后比较。实验数据可丢弃，不连接生产数据库。

## 建立数据库实验环境

创建 `db/compose.yaml`：

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: delivery
      POSTGRES_USER: delivery
      POSTGRES_PASSWORD: ${LAB_DB_PASSWORD:?设置实验密码}
    healthcheck:
      test: [CMD-SHELL, "pg_isready -U delivery -d delivery"]
      interval: 3s
      timeout: 3s
      retries: 20
    volumes:
      - pgdata:/var/lib/postgresql/data
  migrate:
    image: redgate/flyway:11
    platform: linux/amd64
    profiles: [tools]
    depends_on:
      db:
        condition: service_healthy
    environment:
      FLYWAY_URL: jdbc:postgresql://db:5432/delivery
      FLYWAY_USER: delivery
      FLYWAY_PASSWORD: ${LAB_DB_PASSWORD:?设置实验密码}
    volumes:
      - ./sql:/flyway/sql:ro
    command: migrate
volumes:
  pgdata:
```

Flyway 11 的该镜像标签未提供 ARM64 清单，因此本例显式使用 `linux/amd64`。Apple Silicon 的 Docker Desktop 需支持 x86 模拟，原生 Linux ARM 主机应配置模拟或使用 x86 实验机。版本标签便于实验，团队应固定核验过的补丁版本或 digest。创建 `db/sql/V1__init.sql`：

```sql
CREATE TABLE release_notes (
    id BIGINT PRIMARY KEY,
    version TEXT NOT NULL
);
INSERT INTO release_notes (id, version) VALUES (1, 'v1');
```

创建 `db/sql/V2__add_description.sql`：

```sql
ALTER TABLE release_notes ADD COLUMN description TEXT;
```

在 Bash 终端执行：

```bash
read -r -s -p '实验数据库密码: ' LAB_DB_PASSWORD
printf '\n'
export LAB_DB_PASSWORD
docker compose -f db/compose.yaml up -d --wait db
docker compose -f db/compose.yaml run --rm migrate info
docker compose -f db/compose.yaml run --rm migrate migrate
docker compose -f db/compose.yaml run --rm migrate validate
docker compose -f db/compose.yaml exec -T db psql -U delivery -d delivery \
  -c 'SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;'
```

首次应成功记录 V1、V2，再执行 `migrate` 不重复执行已完成的版本迁移。这依赖迁移历史，并不意味着任意 SQL 自动幂等。已应用的脚本不再编辑，修改需求通过新版本表达。

## 兼容性决定发布顺序

本例 V2 仅增加允许空值的列，旧版查询 `SELECT id, version` 仍可运行，因此可先扩展 schema，再发布新应用。真正的改名或删除列通常需要跨多个版本：

| 阶段 | 数据库动作 | 应用兼容性要求 |
| --- | --- | --- |
| 扩展 | 新增字段或表，保留旧结构 | 旧应用继续正常运行 |
| 迁移 | 分批回填并验证数据 | 新应用允许新旧格式并存 |
| 切换 | 新应用切换读写路径 | 观察旧路径是否仍被使用 |
| 收缩 | 回退窗口结束后删除旧结构 | 不再允许直接回退到依赖旧结构的应用 |

应用与 schema 的兼容关系决定顺序，不能统一规定“数据库先改、失败就反向执行”。大表改动还需评估锁等待、执行时长、复制延迟与批量回填策略。

## 故意失败并恢复

仅在此一次性实验环境新建 `db/sql/V3__failure_lab.sql`：

```sql
INSERT INTO release_notes (id, version) VALUES (2, 'failure-lab');
SELECT * FROM intentionally_missing_table;
```

运行 `migrate` 应失败。PostgreSQL 中本例使用的语句可在事务中执行，失败后检查 id=2 不存在：

```bash
docker compose -f db/compose.yaml run --rm migrate migrate
docker compose -f db/compose.yaml exec -T db psql -U delivery -d delivery \
  -c 'SELECT * FROM release_notes WHERE id = 2;'
```

删除这个 **未成功应用、未进入共享发布包** 的实验脚本，再运行 `validate` 和 `migrate`。不能据此推导 MySQL DDL 或所有迁移都能事务回退。正式失败时先检查历史表和真实 schema；`repair` 修正历史元数据，不会自动修复业务数据，禁止盲目执行。

## 多环境与流水线接入

每个环境使用独立数据库、账号和同一套 SQL 版本包。CI 至少做两类验证：空库从头迁移，以及从上一生产 schema 升级；测试数据需覆盖约束冲突和空值等边界。dev 数据库不能替代干净、隔离的迁移测试环境。

发布流程先校验迁移包 checksum，取得目标环境发布锁，再执行迁移、验证数据和部署应用。迁移失败阻断应用部署；若 schema 已成功扩展但应用失败，优先回退到兼容旧应用，保留新增字段，避免无条件删除数据。

| 工具 | 适合主线 | 需要单独确认 |
| --- | --- | --- |
| Flyway | SQL 版本迁移，团队希望直接评审 SQL | 数据库事务行为、版本历史、商业功能边界 |
| Liquibase | 需要结构化 changelog 和多种 change type | 每类变更的 rollback 支持、显式回退 SQL、版本与授权 |

两者都不能保证所有变更自动回滚。选择工具后仍需做恢复演练，记录备份恢复耗时与可接受的数据丢失窗口。

## 最小验收

保留 V1/V2 历史、重复迁移结果、失败实验退出码、id=2 查询结果，并证明旧查询在 V2 后仍可用。结束后 `docker compose -f db/compose.yaml down` 停止实验；卷保留供复查，不默认删除数据。

参考：[Flyway migrations](https://documentation.red-gate.com/fd/migrations-271585107.html)、[PostgreSQL 事务](https://www.postgresql.org/docs/current/tutorial-transactions.html)。
