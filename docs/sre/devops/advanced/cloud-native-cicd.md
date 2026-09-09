---
title: 26 ｜ 全局自动化发布：结课项目
description: 将固定制品验证、数据库迁移、版本化文件和 K8s 发布串成可验收的实验流程。
date: 2026-04-19
updated: 2026-09-08
category: SRE 运维
tags:
  - DevOps
  - CI/CD
---

## 结课目标与执行边界

本课将 `delivery-demo` 的镜像、数据库 SQL 和静态文件纳入同一次发布。它不是跨系统事务：某阶段失败时，前面已经完成的动作可能保留，必须按兼容性决定恢复方法。

使用独立的 `release-lab` namespace、实验 PostgreSQL 和实验 S3 / MinIO bucket。本例选择显式 Push CD，以展示跨系统执行与退出码；不要同时让 Argo CD 管理 `release-lab`。生产若选择 GitOps，应把发布准入放在配置合并前，用控制器调和替代脚本中的 apply，并保留相同的验收契约。

准备已审核的 Linux x86_64 专用 runner，安装 Bash、Docker、kubectl、Cosign、AWS CLI、jq、psql 和 Python 3。runner 必须能访问集群、数据库和对象存储；不接收不可信 PR。kubeconfig 仅允许操作实验 namespace，数据库账号仅用于实验库，bucket 凭据限制在实验前缀。

## 固定一次发布的输入

练习仓库包含：第 12 篇的 `site/`、第 18 篇的 `k8s/`、第 19 篇的 `db/sql/`，以及下面的 `scripts/release.sh`。删除故障实验 SQL，只保留已验证的 V1/V2。将第 21 篇已签名的 `image.txt` 放在仓库根目录，连同 SQL 和配置通过 PR 审核。

工作流 checkout 触发时的确定 commit；审批人核对该 commit、镜像来源、SQL 校验结果和 staging 证据。所有文件来自这次 checkout，不在运行中 `git pull`。前端文件既留在应用镜像中，也作为版本化发布附件上传对象存储，用于演示独立文件发布；本例不宣称已经接入 CDN。

首次创建 `release-lab`，预置 `delivery-secret` 和必要的 `ghcr-read`，准备实验数据库及 bucket。`FLYWAY_IMAGE` 使用已审核的 Flyway 镜像 digest，`SIGNING_IDENTITY` 使用第 21 篇的完整签名身份。

## 发布脚本

保存为 `scripts/release.sh`。变量由下一节工作流提供，脚本不打印凭据。

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${GITHUB_SHA:?}" "${FLYWAY_IMAGE:?}" "${SIGNING_IDENTITY:?}"
: "${FLYWAY_URL:?}" "${FLYWAY_USER:?}" "${FLYWAY_PASSWORD:?}"
: "${S3_ENDPOINT:?}" "${S3_BUCKET:?}" "${ENTRY_URL:?}"
: "${PGHOST:?}" "${PGDATABASE:?}" "${PGUSER:?}" "${PGPASSWORD:?}"
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$FLYWAY_IMAGE" =~ @sha256:[a-f0-9]{64}$ ]]
IMAGE_REF=$(cat image.txt)
[[ "$IMAGE_REF" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
export IMAGE_REF
mkdir -p evidence
# 所有副作用发生前，先验证制品身份与 SBOM。
cosign verify --certificate-identity "$SIGNING_IDENTITY" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  "$IMAGE_REF" > evidence/signature.json
cosign verify-attestation --type cyclonedx \
  --certificate-identity "$SIGNING_IDENTITY" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  "$IMAGE_REF" > evidence/sbom.json
sha256sum db/sql/*.sql site/* > evidence/files.sha256
kubectl get namespace release-lab >/dev/null

# 渲染隔离的结课环境，不改动 prod overlay。
cp -R k8s/overlays/prod k8s/overlays/release-lab
python3 - <<'CODE'
import os, pathlib
name, digest = os.environ['IMAGE_REF'].split('@')
p = pathlib.Path('k8s/overlays/release-lab/kustomization.yaml')
s = p.read_text().replace('namespace: prod', 'namespace: release-lab')
s = s.replace('value: prod.demo.local', 'value: release.demo.local')
s = s.replace('value: prod\n', 'value: release-lab\n')
# 更新结构化字段，不对渲染后的所有 image 行做无差别 sed。
lines = s.splitlines()
for i, line in enumerate(lines):
    if line.strip().startswith('newName:'): lines[i] = '    newName: ' + name
    if line.strip().startswith('digest:'): lines[i] = '    digest: ' + digest
p.write_text('\n'.join(lines) + '\n')
CODE
kubectl kustomize k8s/overlays/release-lab > evidence/rendered.yaml
kubectl apply --dry-run=server -f evidence/rendered.yaml >/dev/null

# 只对兼容性扩展执行此顺序：迁移、文件、应用、验收。
docker run --rm --network host \
  -e FLYWAY_URL -e FLYWAY_USER -e FLYWAY_PASSWORD \
  -v "$PWD/db/sql:/flyway/sql:ro" "$FLYWAY_IMAGE" validate
docker run --rm --network host \
  -e FLYWAY_URL -e FLYWAY_USER -e FLYWAY_PASSWORD \
  -v "$PWD/db/sql:/flyway/sql:ro" "$FLYWAY_IMAGE" migrate
psql -v ON_ERROR_STOP=1 -Atc \
  "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='release_notes' AND column_name='description';" \
  | grep -qx 1

# commit + run id 隔离重试的对象前缀，不覆盖旧版文件。
prefix="releases/$GITHUB_SHA/${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
aws --endpoint-url "$S3_ENDPOINT" s3 cp site/ "s3://$S3_BUCKET/$prefix/" --recursive
aws --endpoint-url "$S3_ENDPOINT" s3 cp "s3://$S3_BUCKET/$prefix/index.html" evidence/index.html
cmp site/index.html evidence/index.html
printf '%s\n' "$prefix" > evidence/asset-prefix.txt

kubectl apply -f evidence/rendered.yaml
kubectl -n release-lab rollout status deployment/delivery-demo --timeout=180s
curl --fail --silent --show-error -H 'Host: release.demo.local' "$ENTRY_URL/healthz" | grep -qx ok
curl --fail --silent --show-error -H 'Host: release.demo.local' "$ENTRY_URL/" > evidence/served.html
cmp site/index.html evidence/served.html
kubectl -n release-lab get deployment delivery-demo \
  -o jsonpath='{.spec.template.spec.containers[0].image}' > evidence/running-image.txt
[ "$(cat evidence/running-image.txt)" = "$IMAGE_REF" ]
printf '发布验收通过：%s\n' "$GITHUB_SHA"
```

数据库 URL 和 PG 连接变量必须指向同一数据库；Flyway 迁移成功后，psql 独立验证 schema。对象前缀每次运行不同，因此失败重试不会覆盖旧附件；清理失败运行的附件属于后续维护，不在失败处理时删除历史版本。

## 用 Environment 串起审批与执行

保存 `.github/workflows/release.yml`。管理员配置 `release-lab` Environment 的 reviewer、仅允许受保护的 `main`，以及对应变量和密钥。自托管 runner 使用 `delivery-lab` 专用标签，限制可用仓库并使用临时 runner 或清理机制。

```yaml
name: Release Lab
on:
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: release-lab
  cancel-in-progress: false
jobs:
  release:
    if: github.ref == 'refs/heads/main'
    runs-on: [self-hosted, linux, x64, delivery-lab]
    environment: release-lab
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - name: Release reviewed revision
        env:
          FLYWAY_IMAGE: ${{ vars.FLYWAY_IMAGE }}
          SIGNING_IDENTITY: ${{ vars.SIGNING_IDENTITY }}
          FLYWAY_URL: ${{ secrets.FLYWAY_URL }}
          FLYWAY_USER: ${{ secrets.FLYWAY_USER }}
          FLYWAY_PASSWORD: ${{ secrets.FLYWAY_PASSWORD }}
          PGHOST: ${{ secrets.PGHOST }}
          PGPORT: ${{ secrets.PGPORT }}
          PGDATABASE: ${{ secrets.PGDATABASE }}
          PGUSER: ${{ secrets.PGUSER }}
          PGPASSWORD: ${{ secrets.PGPASSWORD }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: ${{ vars.AWS_DEFAULT_REGION }}
          S3_ENDPOINT: ${{ vars.S3_ENDPOINT }}
          S3_BUCKET: ${{ vars.S3_BUCKET }}
          ENTRY_URL: ${{ vars.ENTRY_URL }}
        run: bash scripts/release.sh
      - name: Save release evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: release-evidence
          path: evidence/
          if-no-files-found: warn
```

`ENTRY_URL` 是 runner 可达的 K3s HTTP 入口，如 `http://实验节点IP`；数据库和对象存储连接按所在环境提供 TLS 配置。这里所有机密只授予实验环境，不直接替换成生产凭据运行。

并发组只串行化这条 GitHub 发布流程；团队若允许其他发布入口，还需统一目标环境的锁和授权。失败时工作流保持失败，附件归档不改变发布结果。

## 按失败阶段恢复

| 失败位置 | 已发生的动作 | 应对 |
| --- | --- | --- |
| 验签 / 渲染 | 尚未改动目标业务资源 | 修复输入和权限，重新审批 |
| 迁移 | 可能已执行部分数据库操作 | 查历史和真实 schema，按数据库事务行为恢复，不盲目 repair |
| 文件上传 | 兼容 schema 已扩展，附件可能上传部分 | 保留旧版入口，修复上传后重试 |
| 应用 / 验收 | 新版可能部分运行 | 查看 rollout、日志与入口；确认兼容后发布上一镜像 |

恢复应用时通过新的受审发布记录指定上一镜像，并保持与其匹配的 `site/` 文件；保留已成功的兼容 schema 扩展。若需要旧文件，读取旧记录中的对象前缀。删除列、重写数据等不兼容操作不走本例自动流程。

## 结课验收

完成一次 v1 到 v2 发布，归档源码 commit、镜像 digest、签名、SQL 摘要、对象前缀、实际镜像和首页比较结果。再在独立实验环境分别制造身份不匹配、失败 SQL 和缺失健康端点，检查后续步骤被阻断并完成恢复。

本例验证的是三个组件的编排和证据关联。静态页面没有数据库业务请求，不能把 SQL 检查写成端到端业务验证；生产还需真实接口测试、灰度指标、备份恢复演练和受限身份配置。
