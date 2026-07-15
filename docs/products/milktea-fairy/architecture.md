---
title: 技术架构
description: 奶茶仙人的技术栈选型、数据模型设计、评级算法以及跨端逻辑共享策略。
date: 2026-07-15
updated: 2026-07-15
category: 软件产品
tags:
  - 奶茶仙人
  - 技术架构
---

「奶茶仙人」基于多端分离架构设计，前端应用均通过 `pnpm workspaces` 统一管理，并抽离了通用的类型定义与核心算法。

---

## 技术选型

| 模块 | 技术选型 | 说明与职责 |
| :--- | :--- | :--- |
| **微信小程序** | TypeScript + 原生小程序框架 + Vant | 当前核心交付端，负责用户日常的热量打卡、预算看板展示。 |
| **H5 Web 端** | Vue 3 + Vite + Vant | 管理端与预览端，负责复杂的数据统计与管理功能。 |
| **服务端 API** | FastAPI + SQLAlchemy + SQLite | v0.5.0 后端标准接口，采用 SQLite 进行饮品及用户账户的轻量化存储。 |
| **共享逻辑库** | TypeScript + Vitest | 提取评级算法、统计方法为独立共享包，保证多端逻辑一致。 |

---

## 项目组织结构 (Monorepo)

通过模块化 Monorepo 结构，小程序和 Web 端能无缝共用底层的数据结构和测试过的工具类：

```text
drink-budget/
├── apps/
│   ├── miniapp/                # 微信小程序（Vant UI + TS 开发）
│   ├── web/                    # H5 网页（Vue 3 + Vite 驱动）
│   └── api/                    # 后端 API 服务（FastAPI 提供 REST 接口）
├── packages/
│   ├── shared/                 # 跨端共享业务逻辑包（编译后分发）
│   │   ├── src/
│   │   │   ├── index.ts        # 营养评级算法、日历统计、单位换算
│   │   │   └── index.test.ts   # Vitest 测试套件
│   │   └── package.json
│   └── types/                  # 跨端强类型契约
│       ├── src/
│       │   └── index.ts        # 饮品、历史记录及配置的 TypeScript 类型
│       └── package.json
├── docs/                       # 本地详细设计文档
└── package.json                # 工作区配置
```

---

## 核心数据契约

我们在 `packages/types` 中定义了强类型，这是前端、小程序以及后端 API 进行网络请求与持久化存储时的核心数据契约。

### 1. 奶茶饮品 (MilkTeaProduct)

```typescript
export interface MilkTeaProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  size: number;              // 容量，单位 ml
  calories: number;          // 热量，单位 kcal
  sugar: number;             // 糖分，单位 g
  fat: number;               // 脂肪，单位 g
  protein: number;           // 蛋白质，单位 g
  fiber: number;             // 膳食纤维，单位 g
  sodium: number;            // 钠，单位 mg
  grade: 'A' | 'B' | 'C' | 'D'; // 新加坡营养评级标签
  isActive: boolean;         // 上架或在售状态
}
```

### 2. 消费打卡记录 (ConsumptionRecord)

```typescript
export interface ConsumptionRecord {
  id: string;
  productId: string;
  // 核心饮品快照：防止由于后台商品配方、热量更改，导致历史摄入数据发生漂移
  product: Pick<MilkTeaProduct, 'id' | 'name' | 'brand' | 'calories' | 'grade' | 'size'>;
  consumedAt: number;        // 打卡时间戳
  quantity: number;          // 饮用杯数
}
```

### 3. 热量预算 (CalorieBudget)

```typescript
export interface CalorieBudget {
  daily: number;             // 每日最大热量预算 (kcal)
  weekly: number;            // 每周最大热量预算 (kcal)
  unit: 'kcal' | 'kJ';       // 热量单位
  updatedAt: number;         // 配置更新时间戳
}
```

---

## 评级引擎与逻辑共享

### 1. 评级判定逻辑

评级计算器被编写在 `packages/shared/src/index.ts` 中，通过以下条件计算得出：

```typescript
export type Grade = 'A' | 'B' | 'C' | 'D';

export function calculateGrade(calories: number, sugar: number, fat: number): Grade {
  // A级：低卡无糖
  if (calories < 150 && sugar < 5 && fat < 3) return 'A';
  // B级：中低卡微糖
  if (calories < 250 && sugar < 10 && fat < 5) return 'B';
  // C级：中热量半糖
  if (calories < 350 && sugar < 20 && fat < 8) return 'C';
  // D级：高卡重糖重奶
  return 'D';
}
```

### 2. 多端数据缓存与同步策略

由于小程序需要支持离线使用，数据存储机制如下：

- **本地 Storage 缓存**：饮品数据与用户记录首选缓存在设备本地，提供毫秒级无网渲染体验。
- **服务端兜底同步**：在网络通畅时，本地缓存与 SQLite 服务端进行异步数据对齐。
- **测试保障**：`packages/shared` 下的逻辑在发布前会通过 `index.test.ts` 中针对边界条件的单元测试进行保障：
  ```typescript
  test('calculateGrade should follow bottle-neck effect', () => {
    // 即使热量极低，但脂肪超标，也必须落入 D 级
    expect(calculateGrade(50, 2, 9)).toBe('D');
  });
  ```
