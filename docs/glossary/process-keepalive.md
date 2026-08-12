---
id: process-keepalive
term: 进程保活
en: Process Keepalive
aliases:
  - 保活
definition: 确保服务进程持续运行并在异常退出后自动恢复的机制，是生产级部署与临时调试的本质区别。
enabled: true
---

进程可能因崩溃、OOM、服务器重启而退出。保活的手段从 nohup、systemd 到容器重启策略逐步升级，目标是让“失败自愈”成为部署动作的一部分。
