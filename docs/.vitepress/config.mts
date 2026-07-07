// import { defineConfig } from 'vitepress'
import { withMermaid } from "vitepress-plugin-mermaid"
import markdownItTaskListPlus from "markdown-it-task-list-plus"
import llms from 'vitepress-plugin-llms'


// 网站基础路径：优先 .env 的 VITE_BASE_PATH，GitHub Pages 构建时回退到仓库子路径
const basePath =
    process.env.VITE_BASE_PATH ||
    (process.env.GITHUB_ACTIONS === 'true' ? '/xiaolin-docs/' : '/')

const asset = (path: string) => `${basePath}${path.replace(/^\//, '')}`

// @ts-ignore 百度统计 ID
const baiduAnalyticsId = process.env.VITE_BAIDU_ANALYTICS_ID || 'YOUR_BAIDU_ANALYTICS_ID'

// https://vitepress.dev/reference/site-config
// export default defineConfig({
export default withMermaid({
    base: basePath,
    title: "AI持续运维",
    description: "SRE、DevOps 与 AI 技术实践平台",
    srcExclude: [
        '**/wechat/**',
    ],
    vite: {
        plugins: [llms({
            excludeIndexPage: false,
        })],
        optimizeDeps: {
            include: ['cytoscape', 'cytoscape-cose-bilkent', 'dayjs']
        }
    },
    head: [
    ['link', { rel: 'icon', href: asset('sparrow.svg') }],
    ['link', { rel: 'canonical', href: 'https://www.xiaolinstar.cn' }],
    ['script', {}, `
      window._hmt = window._hmt || [];
      (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?${baiduAnalyticsId}";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
      })();
    `],
    ['style', {}, `
     @media (max-width: 768px) {
       .beian-container {
         display: block !important;
         text-align: center;
       }
       .beian-container> a,
       .beian-container > span {
         display: block;
         margin: 4px 0;
       }
       .gongan-beian {
         justify-content: center !important;
       }
     }
   `]
  ],
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        logo: '/sparrow.svg',
        nav: [
            { text: '首页', link: `/` },
            { text: 'SRE运维', link: `/sre/` },
            { text: '开发架构', link: `/software-development/` },
            { text: 'AI实践', link: `/ai/` },
            { text: '软件产品', link: `/products/` },
            { text: '效率工具', link: `/easy-office/` },
            { text: '关于本站', link: `/about/` },
            {
                text: '优惠推荐',
                items: [
                    { text: '推荐首页', link: `/recommend/` },
                    { text: 'Token Plan', link: `/recommend/token-plan` },
                    { text: '云服务器', link: `/recommend/cloud-server` },
                ]
            },
        ],

        sidebar: {
            '/sre/': [
                {
                    text: '运维', link: `/sre/`,
                    items: [
                        {
                            text: 'SRE 实践',
                            link: `/sre/practice/`,
                            items: [
                                { text: 'SRE 实践：服务可靠性案例', link: `/sre/practice/service-reliability` },
                                { text: '阿里云 ACP 微服务', link: `/sre/practice/acp-microservice` },
                                { text: '健康感知，监控、拨测与巡检', link: `/sre/practice/monitoring-health` },
                                { text: '透明，看得见还是看不见', link: `/sre/practice/transparency` },
                                { text: '监控层次：IaaS 层还是基础设施层', link: `/sre/practice/monitoring-layers` },
                                { text: '监控流程：健康感知实践', link: `/sre/practice/monitoring-process` },
                                { text: '两台服务器，撑起多个项目', link: `/sre/practice/opc-server` },
                            ]
                        },
                        {
                            text: '架构设计',
                            link: `/sre/architecture/`,
                            items: [
                                { text: '异常处理架构设计', link: `/sre/architecture/exception-design` },
                                { text: '遗留系统的演进策略', link: `/sre/architecture/legacy-system` },
                                { text: '流程的副作用', link: `/sre/architecture/process-effects` },
                                { text: '异常处理指南', link: `/sre/architecture/exception-guide` },
                                { text: '异常处理备份', link: `/sre/architecture/exception-backup` },
                            ]
                        },
                        {
                            text: '渐进式 DevOps 实践',
                            link: `/sre/devops/cicd/progressive-devops-intro`,
                            items: [
                                { text: '专栏导读：渐进式 DevOps 路线图', link: `/sre/devops/cicd/progressive-devops-intro` },
                                { text: 'L1 级规范：环境变量与配置管理', link: `/sre/devops/cicd/environment` },
                                { text: 'L2 级基础：流水线自动化与 CI/CD 权责分离', link: `/sre/devops/cicd/cicd-07` },
                                { text: 'L2.1 持续集成 CI：源代码到容器镜像', link: `/sre/devops/cicd/cicd-08` },
                                { text: 'L2.2 CI 制品源管控与“软着陆”治理', link: `/sre/devops/cicd/harbor-source-control` },
                                { text: 'L3 级演进：轻量级容器集群 (K3s) 落地', link: `/sre/devops/cicd/k3s` },
                                { text: 'L4 级进阶：持续发布 CD 与生产发布', link: `/sre/devops/cicd/cicd-09` },
                                { text: 'L4.1 交付边界：持续发布与部署交付', link: `/sre/devops/cicd/what-is-cd` },
                                { text: 'L4.2 声明式发布：GitOps 设计理念与实践', link: `/sre/devops/cicd/gitops` },
                                { text: 'L5 级治理：发布变更管控与防线建设', link: `/sre/devops/cicd/change-management` },
                                { text: 'L5.1 变更防错：发布变更，AI 价值', link: `/sre/devops/cicd/change-control` },
                                { text: 'L5.2 平台思考：一站式 DevOps 平台反思', link: `/sre/devops/cicd/devops-platform` },
                            ]
                        },
                        {
                            text: '从零实现 CI/CD 实操演练',
                            link: `/sre/devops/cicd/cicd-01`,
                            items: [
                                { text: '从零实现 01：起步与目标规划', link: `/sre/devops/cicd/cicd-01` },
                                { text: '从零实现 02：应用容器化实践', link: `/sre/devops/cicd/cicd-02` },
                                { text: '从零实现 03：Docker Compose 容器编排', link: `/sre/devops/cicd/cicd-03` },
                                { text: '从零实现 04：Pipeline 流水线工具', link: `/sre/devops/cicd/cicd-04` },
                                { text: '从零实现 05：GitHub Actions 快速介绍', link: `/sre/devops/cicd/cicd-05` },
                                { text: '从零实现 06：GitHub Actions 工作流实践', link: `/sre/devops/cicd/cicd-06` },
                            ]
                        },
                        {
                            text: 'Exception 异常架构专栏',
                            link: `/sre/devops/exception/exception-00`,
                            items: [
                                { text: '异常设计 00：四项核心原则', link: `/sre/devops/exception/exception-00` },
                                { text: '异常设计 01：基础概念与机制', link: `/sre/devops/exception/exception-01` },
                                { text: '异常设计 02：异常分类体系与边界', link: `/sre/devops/exception/exception-02` },
                                { text: '异常设计 03：异常抛出时机与原则', link: `/sre/devops/exception/exception-03` },
                                { text: '异常设计 04：声明式处理理念', link: `/sre/devops/exception/exception-04` },
                                { text: '异常设计 05：系统性处理的思维革命', link: `/sre/devops/exception/exception-05` },
                                { text: '异常设计 06：异常模块规划与文件结构', link: `/sre/devops/exception/exception-06` },
                                { text: '异常设计 07：异常类与错误码设计', link: `/sre/devops/exception/exception-07` },
                                { text: '异常设计 08：全局异常处理器项目集成', link: `/sre/devops/exception/exception-08` },
                            ]
                        },
                        {
                            text: '常见场景部署实践',
                            items: [
                                { text: 'Web 静态站点发布', link: `/sre/devops/cicd/front-dist` },
                                { text: 'Spring 服务端开发部署', link: `/sre/devops/cicd/spring` },
                                { text: 'Git Submodule 父子项目协作', link: `/sre/devops/cicd/git-submodule` },
                                { text: '云原生 CI/CD 全局视角', link: `/sre/devops/cicd/cloud-native-cicd` },
                                { text: 'DevOps 核心能力', link: `/sre/devops/cicd/devops-core` },
                            ]
                        },
                        {
                            text: '运维工具',
                            link: `/sre/tools/`,
                            items: [
                                { text: 'Linux 起手式', link: `/sre/tools/linux-guide` },
                                { text: '项目管理思考', link: `/sre/tools/project-management` },
                            ]
                        },
                        {
                            text: '运营规划',
                            link: `/sre/planning/`,
                            items: [
                                { text: '项目优化规划', link: `/sre/planning/optimization-plan` },
                                { text: '文档媒体规范', link: `/sre/planning/media-standards` },
                                { text: '2026 运营规划', link: `/sre/planning/2026-plan` },
                                { text: '自动生成 Skill 的价值', link: `/sre/planning/skill-value` },
                                { text: 'AI 时代 SRE 的价值重塑', link: `/sre/planning/sre-ai-era` },
                            ]
                        },
                        {
                            text: 'Jenkins',
                            link: `/sre/jenkins`,
                            items: [
                                { text: '你好 Jenkins', link: `/sre/jenkins/hello-jenkins` },
                                { text: 'CI/CD 初体验', link: `/sre/jenkins/cicd-taste` },
                                { text: 'VitePress 快速搭建个人网站', link: `/sre/jenkins/vitepress-docs` },
                            ],
                        },
                        {
                            text: '可观测性',
                            link: `/sre/observability`,
                            items: [
                                { text: '什么是可观测性？', link: `/sre/observability/what-is-observability` },
                                { text: '日志', link: `/sre/observability/log` },
                                { text: '日志系统发展与演进', link: `/sre/observability/log-evolution` },
                                { text: 'Elastic ELK', link: `/sre/observability/ELK-stack` },
                                { text: 'Grafana Loki', link: `/sre/observability/grafana-loki` },
                                // { text: 'Prometheus', link: `/sre/observability/prometheus` },
                                // { text: 'Grafana', link: `/sre/observability/grafana` },
                                // { text: 'Kibana', link: `/sre/observability/kibana` },
                                // { text: 'ELK', link: `/sre/observability/elk` },
                                // { text: 'Jaeger', link: `/sre/observability/jaeger` },
                                // { text: 'Zipkin', link: `/sre/observability/zipkin` },
                                // { text: 'OpenTelemetry', link: `/sre/observability/opentelemetry` },
                            ]
                        }
                    ]
                }
            ],
            '/software-development/': [
                {
                    text: '开发', link: `/software-development/`,
                    items: [
                        {
                            text: '系统设计',
                            link: `/software-development/system-design`,
                            items: [
                                {
                                    text: 'Redis 缓存与高可用',
                                    link: `/software-development/system-design/redis`
                                },
                                {
                                    text: 'Nginx 负载与高可用',
                                    link: `/software-development/system-design/nginx`,
                                }
                            ]
                        },
                        {
                            text: '系统架构设计师',
                            link: `/software-development/system-architecture-designer`,
                            items: [
                                {
                                    text: '软考高级：系统架构设计师',
                                    link: `/software-development/system-architecture-designer/ruankao-advanced`
                                },
                                {
                                    text: '数据库系统基础知识',
                                    link: `/software-development/system-architecture-designer/database`
                                },
                                {
                                    text: '2025下半年秒杀场景',
                                    link: `/software-development/system-architecture-designer/202511-exam`
                                },
                                {
                                    text: '论文备考',
                                    link: `/software-development/system-architecture-designer/paper`
                                },
                            ]
                        },
                        {
                            text: '安全实践',
                            link: `/software-development/security/`,
                            items: [
                                { text: '认证授权基础', link: `/software-development/security/basis-of-auth` },
                                { text: '浏览器同源策略', link: `/software-development/security/same-origin-policy` },
                                { text: 'Cookie 安全问题', link: `/software-development/security/cookie-security` },
                                { text: 'Session 扩展', link: `/software-development/security/session-scalability` },
                                { text: 'JWT 无状态凭证', link: `/software-development/security/jwt` },
                                { text: '凭证安全问题', link: `/software-development/security/credential-security` },
                            ]
                        }
                    ]
                }
            ],

            '/ai/': [
                {
                    text: '人工智能', link: `/ai/`,
                    items: [
                        {
                            text: '理论基础', link: `/ai/theory`,
                            items: [
                                { text: '理论首页', link: `/ai/theory/` },
                                { text: 'AI Coding', link: `/ai/theory/ai-coding` },
                                { text: 'AI Agent 时代下重新审视 Git', link: `/ai/theory/git-in-ai-agent-era` },
                                { text: '全面接入 AI 与驾驭工程', link: `/ai/theory/ai-native-harness` },
                                { text: '个人开发者视角的驾驭工程', link: `/ai/theory/harness-engineering` },
                                { text: '通用 Skill 会消失，领域 Skill 会商品化', link: `/ai/theory/agent-skills-evolution` },
                            ]
                        },
                        {
                            text: 'LLM', link: `/ai/llm`,
                            items: [
                                { text: '登录 Antigravity', link: `/ai/llm/antigravity` },
                                { text: '半小时启动 OpenClaw', link: `/ai/llm/openclaw` },
                                { text: 'AI 记忆系统', link: `/ai/llm/dotai` },
                                { text: 'OpenClaw 用不下去', link: `/ai/llm/openclaw-pain` },
                            ]
                        },
                    ],
                }
            ],

            '/products/': [
                {
                    text: '软件产品', link: `/products/`,
                    items: [
                        { text: '产品总览', link: `/products/` },
                        {
                            text: 'AI 待办',
                            link: `/products/ai-todo/`,
                            items: [
                                { text: '产品介绍', link: `/products/ai-todo/product` },
                                { text: '为什么不做 AI 对话框', link: `/products/ai-todo/why-no-ai-chatbox` },
                                { text: '快速上手', link: `/products/ai-todo/quick-start` },
                                { text: 'Agent 接入', link: `/products/ai-todo/agent` },
                                { text: '技术架构', link: `/products/ai-todo/architecture` },
                            ]
                        },
                        {
                            text: '聚会助手',
                            link: `/products/party-helper/`,
                            items: [
                                { text: '产品理念', link: `/products/party-helper/product` },
                                { text: '场景选型', link: `/products/party-helper/scenarios` },
                                { text: '快速上手', link: `/products/party-helper/quick-start` },
                                { text: '聚会设置', link: `/products/party-helper/party-settings` },
                                {
                                    text: '游戏指南',
                                    link: `/products/party-helper/games/undercover`,
                                    items: [
                                        { text: '谁是卧底', link: `/products/party-helper/games/undercover` },
                                        { text: '阿瓦隆', link: `/products/party-helper/games/avalon` },
                                        { text: '一夜狼人', link: `/products/party-helper/games/one-night-werewolf` },
                                        { text: '真心话大冒险', link: `/products/party-helper/games/truth-or-dare` },
                                    ]
                                },
                                { text: '隐私与反馈', link: `/products/party-helper/privacy-feedback` },
                            ]
                        },
                        {
                            text: '奶茶仙人',
                            link: `/products/milktea-fairy/`,
                            items: [
                                { text: '产品规划', link: `/products/milktea-fairy/` }
                            ]
                        }
                    ]
                }
            ],

            '/easy-office/': [
                {
                    text: '效率工具', link: `/easy-office/`,
                    items: [
                        { text: 'Thunderbird 邮件管理', link: `/easy-office/email-thunderbird` },
                        { text: 'Markdown 语法', link: `/easy-office/markdown` },
                        { text: 'Linux 学习', link: `/easy-office/linux-learn` },
                        { text: 'Mac 办公体验', link: `/easy-office/mac` },
                        { text: 'OpenClaw 个人助手', link: `/easy-office/openclaw-personal-assistant` },
                        { text: '腾讯 QClaw 与 WorkBuddy', link: `/easy-office/tencent-qclaw-workbuddy` }
                    ]
                }
            ],
            '/recommend/': [
                {
                    text: '优惠推荐', link: `/recommend/`,
                    items: [
                        { text: 'Token Plan', link: `/recommend/token-plan` },
                        { text: '云服务器', link: `/recommend/cloud-server` },
                    ]
                }
            ],
            '/about/': [
                {
                    text: '关于本站', link: `/about/`,
                    items: [
                        { text: '联系与合作', link: `/about/` },
                    ]
                }
            ]
        },

        socialLinks: [
            { icon: 'github', link: 'https://github.com/xiaolinstar?tab=repositories' }
        ],
        // 页脚
        footer: {
            message: `微信公众号：AI持续运维，掘金：AI持续运维，<a href="${asset('about/')}">联系与合作</a>`,
            copyright: `Copyright © 2026 xiaolinstar <br/><span class="beian-container" style="display:inline-flex;align-items:center;gap:8px;"><a href="https://beian.miit.gov.cn/" target="_blank">苏ICP备2026011017号-1</a><span class="gongan-beian" style="display:inline-flex;align-items:center;white-space:nowrap;"><img src="${asset('beian-gongan.png')}" alt="公安备案" style="width:16px;height:16px;margin-right:4px;"><a href="http://beian.mps.gov.cn/#query/webSearch?code=32010602012313" target="_blank">苏公网安备32010602012313号</a></span></span>`
        },
        // 支持模糊搜索
        search: {
            provider: 'local'
        }
    },
    // 支持mermaid
    mermaid: {},
    mermaidPlugin: {
        class: "mermaid my-class"
    },
    // pnpm install markdown-it-mathjax3
    // pnpm install markdown-it-task-lists
    markdown: {
        // 支持数学公式
        math: true,
        // 支持代码块行号
        lineNumbers: true,
        config: (md) => {
            md.use(markdownItTaskListPlus)
        }
    },

    // 上次更新
    lastUpdated: true,
    ignoreDeadLinks: 'localhostLinks'
})
