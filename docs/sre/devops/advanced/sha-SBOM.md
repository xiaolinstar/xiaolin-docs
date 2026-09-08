---
title: 16 ｜ 制品防篡改与 SBOM
description: 探讨在软件构建阶段，如何使用文件摘要（SHA-256）进行制品防篡改校验，并自动生成软件物料清单（SBOM）以应对软件供应链安全风险。
date: 2026-03-28
updated: 2026-07-08
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 供应链安全
  - SBOM
---
在云原生和现代微服务架构中，一个看似简单的应用往往依赖了成百上千个第三方开源类库。根据行业统计，现代软件中 **80% 以上的代码实际上来自开源组件**。这意味着，应用的安全边界已经延伸到了外部软件供应链。

近年来，软件供应链攻击（如开源包投毒、Log4j 漏洞）频发。作为 SRE 和 DevOps 工程师，我们在编译和分发制品包时，必须提供「**物料确权**」与「**配料存证**」。这主要依靠两个核心支柱来实现：

1. **唯一性与防篡改证明**：使用文件摘要算法（如 SHA-256）对制品进行哈希校验。
2. **成分透明性**：生成**软件物料清单（SBOM, Software Bill of Materials）**。

---

## 第一支柱：制品哈希防篡改（SHA-256）

在持续集成（CI）阶段，源代码经编译生成了最终的二进制包（如 `.jar`、`.tar.gz` 或容器镜像）。为了确保这个包在经过传输、制品库存储，最终部署到生产环境（CD）的过程中没有被第三方恶意掉包或篡改，必须为制品生成哈希指纹。

### 落地规范
*   **计算哈希**：在 CI 构建成功后，立即使用强哈希算法（通常为 SHA-256）计算文件的 Hash，并将其与制品一同打包归档。例如：
    ```bash
    sha256sum my-app.jar > my-app.jar.sha256
    ```
*   **拉取校验**：在 CD 部署脚本中，拉取包后第一步就是重新计算哈希值，并与 CI 阶段存储的哈希进行强匹配验证。若校验不一致，立即中止发布。
*   **签名机制（进阶）**：在云原生领域，可以通过 **Cosign / Sigstore** 工具对构建出的 Docker 镜像进行非对称加密签名，使得 Kubernetes 集群在拉取镜像时能自动验签（通过 OPA 准入控制器），天然防御未授权镜像在集群中运行。

---

## 第二支柱：软件物料清单 SBOM（Software Bill of Materials）

如果说哈希校验是为了证明「这个包还是当初那个包」，那么 **SBOM** 就是为了说清楚「这个包里到底装了哪些配料」。

SBOM 是一份机器可读的、包含该软件所依赖的全部第三方依赖、开源库、模块版本以及许可证（Licenses）的清单列表。当突发「零日漏洞」（如 Log4j 漏洞）时，SBOM 能让安全运维团队在几秒钟内全局检索出哪些运行中的服务包含了受漏洞影响的特定版本组件，实现精准阻断。

### SBOM 核心标准格式
目前业界公认的标准格式主要有两种：
*   **SPDX (Software Package Data Exchange)**：Linux 基金会主导的国际标准，结构严谨，适合合规性与审计。
*   **CycloneDX**：OWASP 基金会主导，专为安全上下文和漏洞分析设计，格式轻量，对自动化流水线极度友好。

---

## 实践：在流水线中自动生成 SBOM

我们可以使用目前行业最流行的开源工具 **Syft**（由 Anchore 开源），在 CI 构建时自动扫描镜像并输出 CycloneDX 格式的 SBOM，然后将其推送到制品库或与版本 release 绑定。

### 1. 本地生成 SBOM 示例
在本地安装 Syft 后，只需一行命令即可对本地 Docker 镜像进行扫描并输出 JSON：
```bash
syft my-app:v1.0.0 -o cyclonedx-json > sbom.json
```

### 2. 在 GitHub Actions 中自动生成 SBOM 并归档
下面展示如何在构建镜像时自动生成 SBOM，并将其作为制品附件归档到 Actions 构建页中：

```yaml
name: Generate Artifact and SBOM

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-sbom:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Build Application Jar
        run: |
          ./gradlew build -x test

      - name: Build Docker Image
        run: |
          docker build -t myorg/myapp:${{ github.ref_name }} .

      - name: Generate SBOM (CycloneDX format)
        uses: anchore/sbom-action@v0
        with:
          image: "myorg/myapp:${{ github.ref_name }}"
          format: "cyclonedx-json"
          output-file: "sbom.json"

      - name: Archive SBOM Artifact
        uses: actions/upload-artifact@v3
        with:
          name: sbom-report
          path: sbom.json
```

---

## 总结：构建可信交付链

在渐进式运维演进中，物料安全是实现自动化发布的重要保障。通过为每个制品包生成 SHA-256 哈希确保**不可变性**，以及生成 SBOM 确保**透明性**，团队成功将「安全」左移到了流水线的构建环节，为 L5 阶段变更安全治理打下了坚实的技术基础。

## 参考

1. CycloneDX Schema Reference: https://cyclonedx.org
2. Sigstore / Cosign Image Signing: https://github.com/sigstore/cosign


