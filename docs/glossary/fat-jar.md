---
id: fat-jar
term: fat jar
en: Fat JAR
aliases:
  - uber-jar
  - 可执行 jar
  - executable jar
definition: Spring Boot 打包出的自包含 JAR 文件，把应用代码、所有第三方依赖、JDK 运行时一并打入单一归档，跨机器复制后可直接 `java -jar` 运行，无需在目标机器安装额外依赖。
enabled: true
---

与「瘦 jar」（thin jar，仅含应用代码，依赖需在运行时通过 classpath 解析）相对。fat jar 是 Spring Boot 推崇的产物形态，本质是镜像思想在 JVM 生态的早期体现。