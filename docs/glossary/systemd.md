---
id: systemd
term: systemd
en: Systemd
aliases:
  - systemd unit
  - systemd service
definition: 现代 Linux 发行版默认的 init 系统与服务管理器，通过 unit 文件声明进程的启动命令、重启策略、依赖关系、日志输出等，使进程具备开机自启、崩溃自愈、统一日志等生产级保活能力。
enabled: true
---

常用命令：`systemctl start / stop / status / enable / disable <name>`、`journalctl -u <name> -f` 查看服务日志。unit 文件路径：`/etc/systemd/system/<name>.service`（系统级）或 `/etc/systemd/user/`（用户级）。