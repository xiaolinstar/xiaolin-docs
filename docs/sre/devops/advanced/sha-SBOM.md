---
title: 24 ｜ 制品防篡改与 SBOM
description: 区分内容摘要、签名身份和依赖清单，并在 CD 前验证预期构建来源。
date: 2026-03-28
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 供应链安全
  - SBOM
---

## 三种证据分别解决什么

上一课验证镜像质量，本课验证交接过程。课程仍使用 CI 的 `image.txt`，所有证据绑定同一个镜像 digest。

| 证据 | 可以说明 | 不能单独说明 |
| --- | --- | --- |
| SHA-256 / 镜像 digest | 内容是否与预期一致 | 预期摘要是谁提供的、来源是否可信 |
| 签名与构建证明 | 制品与可信身份或构建过程的关联 | 软件没有漏洞 |
| SBOM | 被工具识别的组件、版本等信息 | 已完成漏洞扫描、所有动态依赖都被覆盖 |

制品与摘要一起被替换时，简单比对无法识别恶意来源。不可变存储策略、可信签名身份和仓库权限必须配合使用。SBOM 的覆盖度取决于扫描对象与工具能力，不能承诺自动发现所有依赖。

## 在 CI 中保存 SBOM 并签名

在第 16 篇工作流的镜像测试后加入 SBOM 生成。给 `build` job 的 permissions 增加 `id-token: write`，用于后面的无密钥签名。

```yaml
- name: Generate SBOM
  if: github.event_name == 'push'
  uses: anchore/sbom-action@v0
  with:
    image: ${{ env.IMAGE }}:${{ github.sha }}
    format: cyclonedx-json
    output-file: sbom.json
    upload-artifact: false
```

在 `Push and record digest` 后、同一个 job 中加入：

```yaml
- uses: sigstore/cosign-installer@v3
  if: github.event_name == 'push'
- name: Sign exact image and attest SBOM
  if: github.event_name == 'push'
  run: |
    set -euo pipefail
    IMAGE_REF=$(cat image.txt)
    cosign sign --yes "$IMAGE_REF"
    cosign attest --yes --type cyclonedx --predicate sbom.json "$IMAGE_REF"
- uses: actions/upload-artifact@v4
  if: github.event_name == 'push'
  with:
    name: release-evidence
    path: |
      image.txt
      sbom.json
```

版本标签用于展示，生产应审核并固定 Action SHA。此流程需要 GHCR 写权限、OIDC 和 Sigstore 服务网络连通；签名透明日志会记录相关身份信息。私有环境按组织的信任体系选择托管或自建签名服务。

SBOM 与签名应随镜像共同保留，不能只依赖短期 Actions 附件。制品清理必须同时考虑签名与 attestation 的存储方式。

## CD 验证签名与 SBOM

在可信管理终端或 CD runner 安装与团队基线一致的 Cosign。将下面的 `OWNER/REPO` 替换为练习仓库；工作流路径必须对应真实 `.github/workflows/ci.yml`，不能用任意身份通配符。

```bash
IMAGE_REF=$(cat image.txt)
IDENTITY='https://github.com/OWNER/REPO/.github/workflows/ci.yml@refs/heads/main'
cosign verify \
  --certificate-identity "$IDENTITY" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  "$IMAGE_REF" > verified-signature.json
cosign verify-attestation \
  --type cyclonedx \
  --certificate-identity "$IDENTITY" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  "$IMAGE_REF" > verified-sbom.json
```

两个命令都成功后才能执行部署。签名身份允许的是该工作流及分支，分支保护、workflow 文件评审和账号安全仍属于信任边界。签名不会替代前一课的漏洞门禁。

集群不会因为镜像有签名就自动拒绝未签名镜像。本课在 CD 检查；若要防止旁路部署，还需安装并配置准入验证组件与具体策略，另做拒绝实验。

## 最小验收

- 正常镜像：验签及 attestation 验证成功，内容与 `image.txt` 一致。
- 把身份中的仓库改成另一个仓库：验证失败，部署步骤不得运行。
- 使用没有签名的实验镜像：验证失败。
- 保留失败退出码与跳过部署的日志，不以“生成了 sbom.json”作为可信发布完成的依据。

参考：[Cosign 验证](https://docs.sigstore.dev/cosign/verifying/verify/)、[SBOM Action](https://github.com/anchore/sbom-action)、[Artifact v3 停用公告](https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/)。
