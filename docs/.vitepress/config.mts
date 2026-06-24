// import { defineConfig } from 'vitepress'
import { withMermaid } from "vitepress-plugin-mermaid"
import markdownItTaskListPlus from "markdown-it-task-list-plus"
import llms from 'vitepress-plugin-llms'


// @ts-ignore 网站基础路径，区分GitHub部署和常规部署
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/xiaolin-docs/' : '/'

// @ts-ignore 百度统计 ID
const baiduAnalyticsId = process.env.VITE_BAIDU_ANALYTICS_ID || 'YOUR_BAIDU_ANALYTICS_ID'

// https://vitepress.dev/reference/site-config
// export default defineConfig({
export default withMermaid({
    base: basePath,
    title: "AI持续运维",
    description: "SRE、DevOps 与 AI 技术实践平台",
    vite: {
        plugins: [llms({
            excludeIndexPage: false,
        })],
        optimizeDeps: {
            include: ['cytoscape', 'cytoscape-cose-bilkent', 'dayjs']
        }
    },
    head: [
    ['link', { rel: 'icon', href: '/sparrow.svg' }],
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
                            text: 'DevOps 实践',
                            link: `/sre/devops/`,
                            items: [
                                { text: '发布变更，AI 价值', link: `/sre/devops/change-control` },
                                { text: '云原生CI/CD全局视角', link: `/sre/devops/cloud-native-cicd` },
                                { text: 'CI 制品源管控与“软着陆”治理', link: `/sre/devops/harbor-source-control` },
                                { text: 'DevOps 平台思考', link: `/sre/devops/devops-platform` },
                                { text: 'Git Submodule 父子项目协作', link: `/sre/devops/git-submodule` },
                                { text: '环境管理', link: `/sre/devops/environment` },
                                { text: 'DevOps 核心能力', link: `/sre/devops/devops-core` },
                                { text: 'GitOps 设计理念与实践', link: `/sre/devops/gitops` },
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
                                { text: '2026 运营规划', link: `/sre/planning/2026-plan` },
                                { text: '自动生成 Skill 的价值', link: `/sre/planning/skill-value` },
                                { text: 'AI 时代 SRE 的价值重塑', link: `/sre/planning/sre-ai-era` },
                            ]
                        },
                        {
                            text: 'CI/CD 与 DevOps',
                            link: `/sre/devops`,
                            items: [
                                { text: 'Web 静态站点', link: `/sre/devops/front-dist` },
                                { text: 'Spring 服务端开发', link: `/sre/devops/spring` },
                                { text: '从零实现 CI/CD 01', link: `/sre/devops/cicd-01` },
                                { text: '从零实现 CI/CD 02', link: `/sre/devops/cicd-02` },
                                { text: '从零实现 CI/CD 03', link: `/sre/devops/cicd-03` },
                                { text: '从零实现 CI/CD 04', link: `/sre/devops/cicd-04` },
                                { text: '从零实现 CI/CD 05', link: `/sre/devops/cicd-05` },
                                { text: '从零实现 CI/CD 06', link: `/sre/devops/cicd-06` },
                                { text: '从零实现 CI/CD 07', link: `/sre/devops/cicd-07` },
                                { text: '从零实现 CI/CD 08', link: `/sre/devops/cicd-08` },
                                { text: '从零实现 CI/CD 09', link: `/sre/devops/cicd-09` },
                                { text: 'CD 部署与交付', link: `/sre/devops/what-is-cd` },
                                { text: '发布变更管控', link: `/sre/devops/change-management` },
                                { text: 'K3s', link: `/sre/devops/k3s` },
                                { text: 'Exception 异常架构设计 00', link: `/sre/devops/exception-00` },
                                { text: 'Exception 异常架构设计 01', link: `/sre/devops/exception-01` },
                                { text: 'Exception 异常架构设计 02', link: `/sre/devops/exception-02` },
                                { text: 'Exception 异常架构设计 03', link: `/sre/devops/exception-03` },
                                { text: 'Exception 异常架构设计 04', link: `/sre/devops/exception-04` },
                                { text: 'Exception 异常架构设计 05', link: `/sre/devops/exception-05` }
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
            ]
        },

        socialLinks: [
            { icon: 'github', link: 'https://github.com/xiaolinstar?tab=repositories' }
        ],
        // 页脚
        footer: {
            message: '微信公众号：AI持续运维，掘金：AI持续运维',
            copyright: 'Copyright © 2026 xiaolinstar <br/><span class="beian-container" style="display:inline-flex;align-items:center;gap:8px;"><a href="https://beian.miit.gov.cn/" target="_blank">苏ICP备2026011017号-1</a><span class="gongan-beian" style="display:inline-flex;align-items:center;white-space:nowrap;"><img src="/beian-gongan.png" alt="公安备案" style="width:16px;height:16px;margin-right:4px;"><a href="http://beian.mps.gov.cn/#query/webSearch?code=32010602012313"target="_blank">苏公网安备32010602012313号</a></span></span>'
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
