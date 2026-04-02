# baidu-analytics

**状态**: completed
**优先级**: P0
**创建时间**: 20260331
**负责人**: AI 助手

## 需求描述

接入百度统计，监控网站访问量和转化率

## 实现过程

### 问题诊断

开发环境百度统计脚本未生效，页面代码安装状态显示"未安装"。

**排查过程**：
1. 检查 config.mts 配置，发现脚本注入方式不正确
2. 尝试多种配置方式：head 配置、transformHtml、Vue 组件 mounted 钩子
3. 发现 VitePress 开发服务器不会在 HTML 中注入 head 配置的脚本标签
4. 生产构建（`pnpm run docs:build`）后，脚本正确注入到 HTML 中

**解决方案**：
- 在 `config.mts` 的 head 配置中使用内联脚本方式注入百度统计代码
- 使用环境变量 `VITE_BAIDU_ANALYTICS_ID` 管理统计 ID
- GitHub Actions 中配置不同的仓库变量：
  - `PAGES_BAIDU_ANALYTICS_ID`：用于 GitHub Pages 部署（[page.yml](.github/workflows/page.yml)）
  - `DOCKER_BAIDU_ANALYTICS_ID`：用于 Docker 镜像构建（[ci-ghcr.yml](.github/workflows/ci-ghcr.yml)）

### 验证结果

- ✅ 生产构建的 HTML 中包含百度统计脚本
- ✅ 使用 `grep -r "baidu" docs/.vitepress/dist/` 确认脚本注入成功
- ✅ 脚本格式正确：`<script>(function(){var e=document.createElement("script");e.src="https://hm.baidu.com/hm.js?ID";var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();</script>`

## 任务总结

### 完成总结

百度统计已成功接入 VitePress 项目，通过以下方式实现：

1. **配置方式**：在 config.mts 的 head 配置中使用内联脚本注入百度统计代码
2. **环境变量管理**：使用 `VITE_BAIDU_ANALYTICS_ID` 环境变量管理统计 ID，支持不同部署环境使用不同 ID
3. **GitHub Actions 配置**：GitHub Pages 和 Docker 镜像使用不同的仓库变量，无需本地 .env 文件
4. **验证通过**：生产构建的 HTML 中正确包含百度统计脚本，脚本格式符合百度统计规范

### 经验教训

1. **VitePress 开发环境限制**：开发服务器（`pnpm run docs:dev`）不会在 HTML 中注入 head 配置的脚本标签，需要在生产构建后验证
2. **环境变量隔离**：不同部署环境（GitHub Pages、Docker）应使用不同的环境变量，避免配置冲突
3. **验证方法**：使用 `grep -r "baidu" docs/.vitepress/dist/` 快速验证脚本是否正确注入

### 建议

1. **持续监控**：在百度统计后台监控数据，确认统计正常工作
2. **环境变量文档**：在项目 README 中说明环境变量的配置方法
3. **多环境支持**：如需支持更多部署环境，可扩展环境变量命名规范（如 `STAGING_BAIDU_ANALYTICS_ID`）

### 下一步

1. 监控百度统计数据，确认访问量统计正常
2. 根据访问数据优化网站内容和结构
3. 考虑接入其他分析工具（如 Google Analytics）进行数据对比
