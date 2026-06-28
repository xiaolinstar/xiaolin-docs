<template>
  <div class="recommend-card">
    <div class="recommend-header">
      <span class="recommend-icon">💎</span>
      <span class="recommend-title">开发者推荐</span>
    </div>
    <div class="recommend-list">
      <a
        v-for="item in recommendList"
        :key="item.name"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        class="recommend-item"
        @click="trackClick(item.name)"
      >
        <div class="item-icon" :style="{ backgroundColor: item.color }">
          {{ item.icon }}
        </div>
        <div class="item-info">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.description }}</div>
        </div>
      </a>
    </div>
    <div class="recommend-footer">
      <a :href="withBase('/recommend/')" class="view-more">更多推荐</a>
    </div>
  </div>
</template>

<script setup>
import { withBase } from 'vitepress'

const recommendList = [
  {
    name: '阿里云 ECS',
    icon: '☁️',
    color: '#FF6A00',
    description: '新用户 ¥100 代金券',
    badge: '热门',
    link: 'https://www.aliyun.com/minisite/goods?userCode=d1pmxxar'
  },
  {
    name: '腾讯云轻量',
    icon: '🚀',
    color: '#00A4FF',
    description: '1核2G 仅 ¥99/年',
    badge: '超值',
    link: 'https://curl.qcloud.com/mQu7e5Fu'
  },
  {
    name: '智谱 GLM Coding',
    icon: '🤖',
    color: '#1E90FF',
    description: '送 ¥100-500 Token',
    badge: 'AI编程',
    link: 'https://www.bigmodel.cn/glm-coding?ic=AD49T61WTJ'
  }
];

const trackClick = (name) => {
  // 百度统计事件追踪
  if (window._hmt) {
    window._hmt.push(['_trackEvent', 'sidebar-recommend', 'click', name]);
  }
  console.log(`点击推荐: ${name}`);
};
</script>

<style scoped>
.recommend-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  margin: 0;
  color: #495057;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.recommend-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.recommend-icon {
  font-size: 14px;
  color: #6c757d;
}

.recommend-title {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.recommend-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.recommend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  text-decoration: none;
  color: #495057;
  transition: all 0.2s ease;
}

.recommend-item:hover {
  background: #f8f9fa;
  border-color: #ced4da;
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.item-icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.7;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 1px;
  color: #495057;
}

.item-desc {
  font-size: 10px;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #6c757d;
}

.recommend-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.view-more {
  color: #6c757d;
  text-decoration: none;
  font-size: 12px;
  font-weight: 400;
  opacity: 0.7;
  transition: all 0.2s;
}

.view-more:hover {
  opacity: 1;
  text-decoration: underline;
  color: #495057;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recommend-card {
    padding: 10px;
  }
  
  .recommend-list {
    grid-template-columns: 1fr;
  }
  
  .recommend-item {
    padding: 6px;
  }
  
  .item-icon {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .recommend-header {
    flex-direction: column;
    text-align: center;
    gap: 4px;
  }
  
  .recommend-title {
    font-size: 13px;
  }
}
</style>
