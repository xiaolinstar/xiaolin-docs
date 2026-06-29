# 对内规划文档

本目录存放**不对外发布**的运营、产品、内容规划类文本，**不会**被 VitePress 构建，也**无需**维护 `docs/.vitepress/config.mts` 索引。

与 `docs/sre/planning/` 的区别：

| 目录 | 用途 | 是否上站 |
|------|------|----------|
| `docs/sre/planning/` | 可公开的技术运营思考、规范 | 是 |
| `planning/`（本目录） | 产品运营日历、内测计划、渠道实验记录等 | 否 |

## 目录约定

```
planning/
├── README.md           # 本说明
├── products/           # 按产品分子目录
│   └── ai-todo/
│       ├── 4-week-ops-calendar.md
│       └── product-one-pager.md   # 对外话术统一源
└── …                   # 未来可按 content/、campaign/ 等扩展
```

## 相关目录

- 站点原文：`docs/`
- 多平台分发稿：`content/dist/`
