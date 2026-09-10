---
title: 23 ｜ 质量门禁卡点设计
description: 在镜像推送前执行测试和漏洞检查，并通过失败实验验证门禁确实阻断发布。
date: 2026-03-28
updated: 2026-09-09
category: SRE 运维
tags:
  - DevOps
  - CI/CD
  - 质量门禁
  - 容器安全
---

## 从生成报告到阻断发布

中级篇已经能部署 `delivery-demo`。本课把质量检查加入[第 16 篇 CI](../intermediate/ci-pipeline.md)，验收目标是：检查失败时，镜像不能进入发布步骤。

门禁是可执行规则，不是扫描工具列表。每条规则都要有输入、退出码、责任人和例外期限。

## 分阶段选择检查

| 位置 | 规则 | 失败后的动作 |
| --- | --- | --- |
| 本地 | 格式、语法、快速单测 | 提交前修复；CI 重复关键检查，防止本地跳过 |
| PR / CI | 单测、接口测试、变更质量 | 必需检查不通过则禁止合并 |
| 镜像构建后 | 容器冒烟、漏洞扫描 | 禁止推送候选镜像 |
| 部署前 | 制品身份、环境就绪 | 禁止进入目标环境 |

Python 静态检查可选 Ruff、mypy 等；Pydantic 用于运行时数据验证，不能替代静态分析。覆盖率只能作为辅助指标，应优先覆盖关键业务路径；本课程不把任意一个百分比宣称为通用行业门槛。

## 给现有 CI 增加镜像门禁

在第 16 篇工作流的 `Test image` 之后、登录和推送之前插入：

```yaml
- name: Scan candidate image
  uses: aquasecurity/trivy-action@v0.36.0
  with:
    image-ref: ${{ env.IMAGE }}:${{ github.sha }}
    format: table
    exit-code: '1'
    ignore-unfixed: false
    vuln-type: os,library
    severity: HIGH,CRITICAL
```

这是课程示例策略：阻断全部 HIGH/CRITICAL，包括尚无修复版本的问题。扫描依赖漏洞库更新和网络可用性；工具错误也按失败处理，不默认为安全。生产工作流固定经审核的 Action SHA，并保存工具版本、漏洞库时间与报告，便于解释同一镜像为何今天通过、明天失败。

如果团队决定暂时接受某个无修复漏洞，应为具体 CVE 创建有期限的例外，记录可利用性分析、补偿措施、责任人和复查日期，不直接把所有未修复漏洞一概忽略。

## SonarQube 何时接入

当项目已有代码质量平台时，将扫描接入 CI。Java 项目先编译并生成测试、覆盖率报告，再提供正确的源码、字节码和报告路径。启用 `sonar.qualitygate.wait=true` 后，还要将对应 GitHub check 配置为分支必需检查；扫描成功不等于所有门禁已通过。

本系列的静态页面不为了凑工具而部署 SonarQube。对真实业务，应在同一 CI 中先完成业务测试再构建镜像，避免门禁只检查外壳。

## 验证门禁会阻断

先用正常版本建立成功基线，再在实验 PR 删除 `site/healthz`：容器检查应失败，推送步骤应跳过。另在实验分支于推送前加入 `run: exit 1`，验证该失败不会被 `continue-on-error` 或 `if: always()` 绕过；验证后删除该故障步骤。

漏洞门禁用团队准备的、仅供扫描的已知漏洞测试镜像验证，不部署到生产；记录被命中的 CVE、非零退出码和未发生推送的证据。

## 渐进落地与最小验收

初次引入可以先观察报告，再针对新代码或高风险问题阻断。例外审批应与特定镜像 digest 绑定，镜像变化即重新检查，不能给仓库永久免检。

验收材料包括正常 run、失败 run、分支保护设置及例外样例。下一课把“检查过的镜像”进一步绑定到可验证的构建身份。

参考：[Trivy Action](https://github.com/aquasecurity/trivy-action)、[SonarQube GitHub Actions 集成](https://docs.sonarsource.com/sonarqube-server/latest/devops-platform-integration/github-integration/adding-analysis-to-github-actions-workflow/)。
