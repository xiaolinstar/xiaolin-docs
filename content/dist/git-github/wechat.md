---
origin: docs/sre/devops/foundation/git-github.md
origin_url: https://xiaolinstar.cn/sre/devops/foundation/git-github.html
slug: git-github
account: AI持续运维
mode: repurpose+polish
status: ready
polish:
  - 正文从 Origin 同步，移除公众号不可用的站内链接、参考文献与 VitePress 折叠块。
  - 保留 Git、GitHub、SSH 与部署追溯的主线；表格、代码和列表由复制稿按微信编辑器兼容规则渲染。
  - 不在正文中保留下一篇文章的站内跳转链接，以发布问题收束。
  - 表格采用两列无竖线行表：保留原始表格语义，将长内容合并进说明列以兼容手机端。
  - 重新从 Origin 生成复制页；表格降级为纯 table / tr / td 结构，避免微信编辑器忽略 thead、th 等节点。
  - 恢复“断点 / 手动备份 / Git”与“平台 / 特点 / 推荐场景”两张原文三列对照表，保留横线、移除竖线以兼顾手机端。
  - 保护反引号中的 Markdown 语法示例，避免将 `$...$` 与 `$$...$$` 误识别为待渲染公式。
  - 全部表格严格保持与 Origin 一致的三列结构；真实数学公式不允许在符号或字母中任意断行。
  - 将表格内 `mv` 目录 + 重启改写为“重命名目录并重启”，规避微信对行内代码的异常换行；移除无法直接跳转的站内延伸阅读句，并将 TIP / WARNING 转为公众号提示块。
  - 6 张表保留为 Markdown 风格的原生三列对照表，采用浅灰表头与细边框，复制后可直接粘贴到公众号后台。
  - 长英文报错与长命令自动启用可换行代码样式，避免微信公众号编辑器撑破正文边界。
  - 复制页使用浏览器原生选区复制，不再克隆和内联整篇样式，避免公众号编辑器产生额外白边框；图片在后台单独插入。
---

# 发布元数据

## 标题备选（人工筛选）

1. DevOps 基础 04 ｜ Git 与 GitHub：版本管理与云端仓库（系列化）
2. 服务器跑的是哪份代码？Git 给部署留下一条可回退的路
3. 不再手工备份：用 Git 让每次发布都有据可查

**选用**：1

## 摘要（118 字）

我把 Git 放进 DevOps 基础系列，是因为部署真正怕的不是发错，而是根本不知道服务器跑的是哪份代码。本文从手动备份的断点出发，讲清 Git 快照、GitHub 远程仓库、SSH 免密协作，以及如何让每次发布都能定位、复现和回退。

## 搜索关键词（4 个）

Git、GitHub、Git 版本管理、SSH 密钥配置

---

# 正文（粘贴到公众号后台）

正文由 `docs/sre/devops/foundation/git-github.md` 同步生成。请打开 `wechat-copy.html`，点击「一键复制正文」后粘贴到公众号编辑器。

---

# 发布 checklist

- [ ] 标题已单独填入公众号后台：DevOps 基础 04 ｜ Git 与 GitHub：版本管理与云端仓库
- [ ] 摘要已填入公众号后台
- [ ] 正文已从 `wechat-copy.html` 一键复制并粘贴
- [ ] 正文信息图已成功粘贴
- [ ] 封面图已上传
- [ ] 后台手机端预览排版正常
- [ ] 公众号名片已插入文末
- [ ] 发布后将 `meta.yaml` → `platforms.wechat.status` 更新为 `published`

## 封面图

封面文件：`docs/public/images/img-git-github/04-wechat-cover.png`，尺寸 `900×383`，公众号后台请单独上传。
