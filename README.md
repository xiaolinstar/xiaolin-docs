# 持续运维｜基于VitePress搭建个人网站

> 运维相关工作经验分享

## 代办TODO

* [X]  大家Jenkins docker in docker平台
* [X]  Jenkins持续集成、持续部署
* [X]  支持SSL，使用https访问，将端口号改为443
* [X]  变更时区为Asia/Shanghai，自适应黑白主题
* [X]  docker compose启动容器
* [ ]  完善项目README
* [ ]  GitHub Pages文件标签显示


## 问题记录
- VitePress中图片等静态文件build
- Dockerfile中使用国内镜像安装
- 时区问题
- 阿里云「HTTPS加速网关」配置，不需要修改原项目任何配置信息，包括80端口
- 

## 配置

本项目依赖以下技术：

- VitePress: VitePress 是一个静态站点生成器 (SSG)，专为构建快速、以内容为中心的站点而设计。简而言之，VitePress 获取用 Markdown 编写的内容，对其应用主题，并生成可以轻松部署到任何地方的静态 HTML 页面。
- Jenkins: 一款开源 CI&CD 软件，用于自动化各种任务，包括构建、测试和部署软件。
- Docker和Docker Compose: 容器，环境隔离
- Nginx: Web服务器，代理静态资源
- npm & pnpm: 前端包管理器，安装第三方库，项目编译、打包等 

## 更新日志

2024-09-13：支持`Dockerfile`构建镜像，添加`Jenkinsfile`


## 关于运维

> 本词条由「豆包」提供

运维，即运行维护，是指对企业的 IT 系统及各类基础设施进行维护和管理，确保其稳定、高效、安全地运行。

### 一、运维的主要职责

1. 系统监控：
2. 故障处理：
3. 系统部署与升级：
4. 性能优化：
5. 安全管理：
6. 资源管理：

### 二、运维的重要性

1. 保障业务连续性：
2. 提高系统性能和效率：
3. 增强系统安全性：
4. 支持业务创新和发展：

总之，运维是企业 IT 系统稳定运行的重要保障，对于提高系统性能、增强安全性、支持业务创新和发展都起着至关重要的作用。

## DevOps

> 本词条由「豆包」提供

DevOps 是一种将软件开发（Dev）和 IT 运维（Ops）紧密结合的理念和方法。它旨在打破传统开发和运维之间的壁垒，实现更高效、更快速、更可靠的软件交付和持续改进。

### 一、DevOps 的核心概念

1. 协作与沟通
2. 自动化：
3. 持续改进：
4. 基础设施即代码（IaC）：

### 二、DevOps 的优势

1. 提高软件交付速度：
2. 提高软件质量：
3. 增强团队协作和沟通：
4. 提高系统的可扩展性和灵活性：

### 三、DevOps 的实施步骤

1. **文化转变**：

   - 推动 DevOps 文化的转变是实施 DevOps 的第一步。这需要企业高层的支持和领导，鼓励团队之间的协作和沟通，打破部门之间的壁垒。
   - 可以通过培训、分享会、团队建设等活动，提高团队成员对 DevOps 的认识和理解，培养团队的协作精神和创新能力。
2. **工具选择和集成**：

   - 选择适合企业需求的 DevOps 工具，并进行集成和优化。这些工具包括持续集成/持续部署工具、自动化测试工具、监控工具、版本控制系统等。
   - 例如，可以选择 Jenkins、GitLab CI/CD、Selenium、Prometheus 等工具，并根据企业的实际情况进行集成和配置。
3. **流程优化**：

   - 对软件开发和运维的流程进行优化，实现自动化和持续改进。这包括代码管理、构建、测试、部署、监控等环节的流程优化。
   - 例如，可以采用敏捷开发方法，优化需求管理、项目管理、代码审查等流程；建立自动化测试体系，提高测试效率和质量；实现持续部署，缩短软件发布周期。
4. **基础设施自动化**：

   - 采用基础设施即代码的方法，实现基础设施的自动化部署和管理。这可以提高基础设施的可重复性和可维护性，降低基础设施管理的成本和风险。
   - 例如，可以使用 Terraform、Ansible 等工具，将服务器、网络、存储等基础设施的配置编写为代码，并通过版本控制系统进行管理。
5. **持续监控和反馈**：

   - 建立持续监控和反馈机制，实时监测系统的运行状态，及时发现问题并进行处理。同时，收集用户反馈和性能指标数据，进行分析和优化，不断提高软件的质量和系统的稳定性。
   - 例如，可以使用 Prometheus、Grafana 等监控工具，实时监测系统的性能指标和运行状态；建立用户反馈渠道，及时收集用户的意见和建议，进行改进和优化。

总之，DevOps 是一种将软件开发和 IT 运维紧密结合的理念和方法，它可以帮助企业提高软件交付速度、质量和系统的稳定性，增强团队协作和沟通，提高系统的可扩展性和灵活性。实施 DevOps 需要企业进行文化转变、工具选择和集成、流程优化、基础设施自动化和持续监控和反馈等步骤，逐步实现 DevOps 的目标。
