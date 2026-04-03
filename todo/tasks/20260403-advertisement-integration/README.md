# advertisement-integration

**状态**: 基本完成，待优化调试
**优先级**: P2
**创建时间**: 20260403
**负责人**: AI 助手

## 需求描述

接入推广广告，实现网站流量变现。通过接入阿里云、腾讯云、智谱 AI 等平台的推广链接，获取新客户或新购产品的激励金。

### 背景与动机

网站已经积累了一定的访问量，可以通过接入推广广告实现流量变现。技术类网站适合推广云服务和 AI 工具，与网站内容高度相关，能够为用户提供价值的同时获得收益。

### 核心需求

1. **需求一**：调研并选择合适的广告平台和推广计划
2. **需求二**：申请推广链接和追踪代码
3. **需求三**：在网站合适位置展示广告内容
4. **需求四**：实现广告点击追踪和效果统计
5. **需求五**：优化广告展示位置和形式，提高转化率

### 非功能性需求

1. **用户体验**：广告展示不影响用户阅读体验
2. **内容相关性**：广告内容与网站主题相关
3. **合规性**：遵守各平台的推广政策和法规要求
4. **可追踪性**：能够追踪广告效果和收益
5. **可维护性**：广告内容易于更新和管理

## 广告平台规划

### 云服务类

#### 1. 阿里云推广计划
- **申请地址**: https://promotion.aliyun.com/ntms/yunparter/index.html
- **激励政策**: 新客户注册奖励 + 首购返现
- **适合页面**: 云服务、DevOps、部署相关文章
- **预估收益**: 新客户注册 ¥50-100，首购返现 10-20%
- **我的推广链接**: `https://www.aliyun.com/minisite/goods?userCode=d1pmxxar`
- **账号状态**: `【待申请/审核中/已通过】`

#### 2. 腾讯云推广计划
- **申请地址**: https://cloud.tencent.com/act/cps/redirect
- **激励政策**: 新客户注册奖励 + 消费返现
- **适合页面**: 云服务、服务器、域名相关文章
- **预估收益**: 新客户注册 ¥30-80，消费返现 10-15%
- **我的推广链接**: `https://curl.qcloud.com/mQu7e5Fu` 

#### 3. 华为云推广计划
- **申请地址**: https://activity.huaweicloud.com/cps.html
- **激励政策**: 新客户注册奖励 + 首购返现
- **适合页面**: 企业级服务、安全相关文章
- **预估收益**: 新客户注册 ¥50-100，首购返现 10-20%
- **我的推广链接**: 【待申请】
- **账号状态**: 【待申请】

### AI 工具类

#### 4. 智谱 AI (GLM) 推广计划
- **申请地址**: https://open.bigmodel.cn/
- **激励政策**: 新客户注册送 Token + 消费返现
- **适合页面**: AI 开发、大模型应用相关文章
- **预估收益**: 新客户注册送 ¥100-500 Token，消费返现 10-15%
- **我的推广链接**: 
🙋蹲队友拼智谱 Coding Plan！
🧩国内顶流编程大模型，20+主流工具全适配，性价比拉满，
👉立即参与「拼好模」：https://www.bigmodel.cn/glm-coding?ic=AD49T61WTJ


#### 5. 百度智能云推广计划
- **申请地址**: https://cloud.baidu.com/campaign/cps/index.html
- **激励政策**: 新客户注册奖励 + 产品折扣
- **适合页面**: AI 应用、文心一言相关文章
- **预估收益**: 新客户注册 ¥50-200，产品折扣 20-50%
- **我的推广链接**: `【请在此处填写您的百度智能云推广链接】`
- **账号状态**: `【待申请/审核中/已通过】`

#### 6. 火山引擎推广计划
- **申请地址**: https://www.volcengine.com/
- **激励政策**: 新客户注册奖励 + 消费返现
- **适合页面**: AI 开发、豆包大模型相关文章
- **预估收益**: 新客户注册 ¥100-300，消费返现 10-20%
- **我的推广链接**: `【请在此处填写您的火山引擎推广链接】`
- **账号状态**: `【待申请/审核中/已通过】`

### 开发工具类

#### 7. GitHub Copilot 推广
- **申请地址**: https://github.com/features/copilot
- **激励政策**: 免费试用 + 订阅返现
- **适合页面**: AI 编程、开发效率相关文章
- **预估收益**: 订阅返现 10-20%
- **我的推广链接**: `【请在此处填写您的 GitHub Copilot 推广链接】`
- **账号状态**: `【待申请/审核中/已通过】`

#### 8. JetBrains 推广计划
- **申请地址**: https://www.jetbrains.com/shop/affiliate
- **激励政策**: 销售佣金
- **适合页面**: IDE 推荐、开发工具相关文章
- **预估收益**: 销售额的 10-20%
- **我的推广链接**: `【请在此处填写您的 JetBrains 推广链接】`
- **账号状态**: `【待申请/审核中/已通过】`

## 广告展示位置规划

### 1. 文章内嵌广告
- **位置**: 文章开头、中间、结尾
- **形式**: 文字链接、Banner 图片
- **内容**: 与文章主题相关的云服务或 AI 工具
- **示例**:
  ```markdown
  ## 推荐云服务器

  如果您想搭建自己的网站，推荐使用[阿里云 ECS](您的推广链接)，新用户注册可获 ¥100 代金券。

  或者选择[腾讯云轻量应用服务器](您的推广链接)，1 核 2G 仅需 ¥99/年。
  ```

### 2. 侧边栏广告
- **位置**: 文章页面右侧或左侧边栏
- **形式**: 固定 Banner、推荐卡片
- **内容**: 热门云服务和 AI 工具推荐
- **特点**: 全站展示，持续曝光

### 3. 页脚广告
- **位置**: 页面底部
- **形式**: 文字链接列表
- **内容**: 合作伙伴链接、推荐工具
- **特点**: 不影响阅读，长期展示

### 4. 专题页面
- **位置**: 独立推广页面
- **形式**: 详细介绍 + 推广链接
- **内容**: 云服务对比、AI 工具推荐
- **示例**:
  - 「云服务器选购指南」页面
  - 「AI 开发工具推荐」页面

## 推进情况

### 20260403 - 任务创建

- [x] 创建任务文件夹
- [x] 编写需求文档
- [x] 申请阿里云推广账号
- [x] 申请腾讯云推广账号
- [x] 申请智谱 AI 推广账号
- [x] 开发广告展示组件
- [x] 集成追踪系统
- [ ] 部署上线

### 20260404 - 推广页面与组件开发

- [x] 创建推广文章合集页面 (/recommend/)
- [x] 设计导航栏"优惠推荐"入口
- [x] 开发侧边栏推广卡片组件 (RecommendCard.vue)
- [x] 集成百度统计点击追踪
- [x] 将推广卡片从侧边栏移至页脚
- [x] 优化推广卡片样式，减少视觉干扰
- [x] 配置推广页面侧边栏导航
- [ ] 部署到生产环境
- [ ] 验证广告展示效果

### 20260405-20260410 - 内容优化

- [x] 编写云服务器推荐专题文章 (cloud-server.md)
- [x] 编写大模型工具推荐专题文章 (ai-model.md)
- [x] 编写 AI IDE 推荐专题文章 (ai-ide.md)
- [x] 更新推广页面，添加热门推荐和专题概述
- [ ] 在相关文章中嵌入推广链接
- [ ] 测试转化效果
- [ ] 补充更多个人推广链接（华为云、百度智能云、火山引擎等）

### 20260411-20260415 - 数据监控与优化

- [ ] 监控广告点击数据
- [ ] 分析转化率
- [ ] 优化广告位置和内容
- [ ] 调整推广策略

## 申请步骤

### 阿里云推广计划申请
1. 登录阿里云账号
2. 访问推广联盟页面：https://promotion.aliyun.com/ntms/yunparter/index.html
3. 点击"立即加入"或"申请推广"
4. 填写个人信息和网站信息
5. 提交审核（通常 1-3 个工作日）
6. 审核通过后获取推广链接

### 腾讯云推广计划申请
1. 登录腾讯云账号
2. 访问推广联盟：https://cloud.tencent.com/act/cps/redirect
3. 点击"立即推广"或"加入推广"
4. 填写推广信息
5. 提交审核
6. 审核通过后获取推广链接和素材

### 智谱 AI 推广计划申请
1. 访问智谱 AI 开放平台
2. 注册/登录账号
3. 进入"推广计划"或"合作伙伴"页面
4. 填写申请表单
5. 提交申请
6. 等待审核（通常 3-5 个工作日）

## 技术实现

### 推广链接配置
```javascript
// adLinks.js - 请填写您的专属推广链接
const adLinks = {
  aliyun: {
    ecs: '【您的阿里云 ECS 推广链接】',
    rds: '【您的阿里云 RDS 推广链接】',
    oss: '【您的阿里云 OSS 推广链接】'
  },
  tencent: {
    cvm: '【您的腾讯云 CVM 推广链接】',
    mysql: '【您的腾讯云 MySQL 推广链接】',
    cos: '【您的腾讯云 COS 推广链接】'
  },
  zhipu: {
    glm: '【您的智谱 AI 推广链接】',
    chatglm: '【您的 ChatGLM 推广链接】'
  }
};

export default adLinks;
```

### 广告展示组件
```vue
<template>
  <div class="ad-container">
    <div v-if="type === 'inline'" class="inline-ad">
      <p class="ad-label">推荐工具</p>
      <a :href="link" target="_blank" rel="noopener noreferrer" class="ad-link">
        {{ title }}
      </a>
      <p class="ad-description">{{ description }}</p>
    </div>
    <div v-else-if="type === 'sidebar'" class="sidebar-ad">
      <a :href="link" target="_blank" rel="noopener noreferrer">
        <div class="ad-content">
          <h3>{{ title }}</h3>
          <p>{{ description }}</p>
          <span class="ad-badge">{{ badge }}</span>
        </div>
      </a>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    type: String,
    title: String,
    description: String,
    link: String,
    badge: String
  }
}
</script>

<style scoped>
.ad-container {
  margin: 20px 0;
}

.inline-ad {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.ad-label {
  font-size: 12px;
  color: #6c757d;
  margin: 0 0 8px 0;
}

.ad-link {
  font-size: 16px;
  font-weight: 600;
  color: #007bff;
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.ad-link:hover {
  text-decoration: underline;
}

.ad-description {
  font-size: 14px;
  color: #495057;
  margin: 0;
}

.sidebar-ad {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.sidebar-ad:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.ad-content {
  padding: 15px;
}

.ad-content h3 {
  font-size: 16px;
  margin: 0 0 8px 0;
  color: #212529;
}

.ad-content p {
  font-size: 14px;
  color: #6c757d;
  margin: 0 0 12px 0;
}

.ad-badge {
  background: #007bff;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}
</style>
```

## 验证标准

### 功能验证

- [ ] 成功申请至少 3 个平台的推广账号
- [ ] 广告组件正常展示
- [ ] 点击追踪正常工作
- [ ] 收益统计准确

### 质量验证

- [ ] 广告不影响用户体验
- [ ] 广告内容与网站主题相关
- [ ] 广告展示位置合理
- [ ] 收益达到预期目标

### 完成标准

- [ ] 推广广告成功接入
- [ ] 开始产生收益
- [ ] 用户反馈良好
- [ ] 可以持续优化

## 预期收益

### 短期（1-3 个月）

- **月均访问量**: 1000-5000 PV
- **点击率**: 1-3%
- **转化率**: 0.5-2%
- **预估月收益**: ¥100-500

### 中期（3-6 个月）

- **月均访问量**: 5000-20000 PV
- **点击率**: 2-5%
- **转化率**: 1-3%
- **预估月收益**: ¥500-2000

### 长期（6-12 个月）

- **月均访问量**: 20000+ PV
- **点击率**: 3-8%
- **转化率**: 2-5%
- **预估月收益**: ¥2000-10000

## 风险评估

- **风险**: 广告影响用户体验
  - **缓解**: 控制广告数量和位置，确保内容相关性
- **风险**: 推广政策变化
  - **缓解**: 多平台布局，分散风险
- **风险**: 收益不达预期
  - **缓解**: 持续优化，测试不同方案
- **风险**: 合规性问题
  - **缓解**: 遵守各平台政策和法规要求

## 任务总结

### 完成总结

[任务完成总结]

### 经验教训

1. [经验教训一]
2. [经验教训二]
3. [经验教训三]

### 建议

1. [建议一]
2. [建议二]
3. [建议三]

### 下一步

1. [下一步一]
2. [下一步二]
3. [下一步三]

## 备注

### 申请进度跟踪

| 平台 | 申请日期 | 审核状态 | 推广链接 | 备注 |
|------|----------|----------|----------|------|
| 阿里云 | 20260403 | 已通过 | https://www.aliyun.com/minisite/goods?userCode=d1pmxxar | 新用户送 ¥100 代金券 |
| 腾讯云 | 20260403 | 已通过 | https://curl.qcloud.com/mQu7e5Fu | 1 核 2G 仅需 ¥99/年 |
| 智谱 AI | 20260403 | 已通过 | https://www.bigmodel.cn/glm-coding?ic=AD49T61WTJ | 新用户送 ¥100-500 Token |
| 华为云 | 【待申请】 | 【待申请】 | 【待填写】 | 需要申请推广链接 |
| 百度智能云 | 【待申请】 | 【待申请】 | 【待填写】 | 需要申请推广链接 |
| 火山引擎 | 【待申请】 | 【待申请】 | 【待填写】 | 需要申请推广链接 |
| GitHub Copilot | 【待申请】 | 【待申请】 | 【待填写】 | 需要申请推广链接 |
| JetBrains | 【待申请】 | 【待申请】 | 【待填写】 | 需要申请推广链接 |

### 推广链接申请地址

1. **阿里云**: https://promotion.aliyun.com/ntms/yunparter/index.html
2. **腾讯云**: https://cloud.tencent.com/act/cps/redirect
3. **智谱 AI**: https://open.bigmodel.cn/
4. **百度智能云**: https://cloud.baidu.com/campaign/cps/index.html
5. **火山引擎**: https://www.volcengine.com/cps/

### 相关文档

- [阿里云推广政策](https://promotion.aliyun.com/ntms/yunparter/index.html)
- [腾讯云推广政策](https://cloud.tencent.com/act/cps/redirect)
- [智谱 AI 推广政策](https://open.bigmodel.cn/)
