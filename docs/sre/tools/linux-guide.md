# 云服务器 Linux 起手式，为什么你的 shell 这么好看？

开发运维人员经常与黑乎乎的终端打交道，使用体验差、效率低。一些用户了解可使用各类软件如oh-my-zsh等来优化用户体验，但在云服务器配置过程中面临的网络访问困难、重复配置效率低下等痛点。本文介绍 Linux 环境起手式，安装必备的软件，包括 zsh、oh-my-zsh、git、docker 等。

*关键词：云服务器配置、国内网络优化、oh-my-zsh、Docker、系统镜像*


面向云服务器环境，开发、运维工程师，特别适用于国内网络。

注：本文所有的命令都是在 Ubuntu 22.04 LTS 上测试通过的，基于腾讯云服务器。

## 操作系统 Ubuntu 22.04 LTS

在国内的开发环境中，Ubuntu 是非常流行的，可与之相提并论的 Debian。Ubuntu 更注重用户体验，而 Debian 更注重稳定性。

LTS 版本是 Long Term Support 的缩写，意思是长期支持版本。

推荐选择20.04或22.04等LTS版本，不太推荐24.04是因为新版本配套软件可能不完善，容易出现难以解决的问题。

初始化服务器系统时，支持多种类型：使用应用模板、**基于操作系统镜像**、使用容器镜像、**使用自定义镜像**，可根据实际情况选择。

![ubuntu 22.04 操作系统](/images/img-linux-guide/tencent-instance.png)

启动后可以首先执行基本的系统初始化配置，比如更新软件包列表、升级系统软件等。

```bash
# 更新软件包列表
sudo apt update && sudo apt upgrade -y
```

国内云服务厂商的都默认了依赖包安装源，无需修改。如果是在 VMWare 上安装 Ubuntu 22.04 LTS，需要注意的是，默认的安装源是 Ubuntu 官方的源，而不是国内的源，需要手动修改为国内的源。

### Git 配置

git 是版本控制工具，用于管理代码的版本，Linux 操作系统发行版本一般都默认安装，直接进行配置即可。

```bash
git --version # 先查看下 git 版本，验证是否安装


git config --global user.name "your_name"
git config --global user.email "your_email@example.com"
git config --global init.defaultBranch main # 设置默认分支为 main

```

Github、Gitee、Gitlab 等代码托管平台都支持 SSH 协议，你可以在本地生成 SSH 密钥对，然后将公钥添加到代码托管平台的账户中。

```bash
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"
# 私钥文件：~/.ssh/id_ed25519
chmod 700 ~/.ssh/id_ed25519 # 设置低权限
```

建议一次生成密钥对后，自行保存管理（比如放到密码管理工具），可以重复使用，分发到其他服务器。

注：Ed25519 是一种 SSH 密钥算法，它比传统的 RSA 算法更安全，也更快速，已经基本取代 RSA 和 ECDSA。

### 主机名称更换

默认名为`VM-XXX`，可以根据偏好更换，尤其是需要在多台服务器之间切换时。

```bash
hostnamectl set-hostname <新主机名>
```

## 默认 SHELL：zsh

Linux 操作系统中默认的 SHELL 是 bash，但是 bash 比较旧，功能也比较有限。macOS 从版本10.15 Catalina（2019年）开始，默认的 SHELL 由Bash 切换到 zsh。

zsh 确实更强大，功能丰富，支持更好的自动补全和主题定制。

```bash
sudo apt install zsh

# 设置为默认shell
chsh -s /bin/zsh
```

检查当前 SHELL 是否为 zsh：

```bash
echo $SHELL
```

## zsh 增强，oh-my-zsh

oh-my-zsh 是一个社区驱动的 zsh 配置框架，它提供了很多有用的功能，比如插件、主题等。

![oh-my-zsh GitHub Repository](/images/img-linux-guide/ohmyzsh-repository.png)

### 安装 oh-my-zsh

国内云服务器网络访问 GitHub 可能会比较慢，我基于GitHub官方安装脚本和国内清华源镜像，使用大模型生成的安装脚本

```shell
#!/bin/bash
#
# Oh My Zsh 一键安装脚本 - 清华源版本
# 解决国内网络访问GitHub困难的问题
#

# 设置清华源镜像
OHMYZSH_REPO="https://mirrors.tuna.tsinghua.edu.cn/git/ohmyzsh.git"
ZSH_SYNTAX_HIGHLIGHTING_REPO="https://mirrors.tuna.tsinghua.edu.cn/github/zsh-users/zsh-syntax-highlighting.git"
ZSH_AUTOSUGGESTIONS_REPO="https://mirrors.tuna.tsinghua.edu.cn/github/zsh-users/zsh-autosuggestions.git"
ZSH_COMPLETIONS_REPO="https://mirrors.tuna.tsinghua.edu.cn/github/zsh-users/zsh-completions.git"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查是否已安装zsh
check_zsh_installed() {
    if ! command_exists zsh; then
        log_error "zsh 未安装，请先安装 zsh"
        echo "安装命令：sudo apt install zsh"
        exit 1
    fi
}

# 检查当前shell
check_current_shell() {
    local current_shell=$(basename "$SHELL")
    if [ "$current_shell" = "zsh" ]; then
        log_success "当前shell已经是 zsh"
        return 0
    else
        log_warning "当前shell是 $current_shell，建议切换为 zsh"
        return 1
    fi
}

# 安装 Oh My Zsh
install_ohmyzsh() {
    log_info "开始安装 Oh My Zsh..."

    # 备份现有的 .zshrc 文件
    if [ -f "$HOME/.zshrc" ]; then
        log_info "备份现有的 .zshrc 文件"
        cp "$HOME/.zshrc" "$HOME/.zshrc.backup.$(date +%Y%m%d%H%M%S)"
    fi

    # 克隆 Oh My Zsh 仓库
    if git clone --depth=1 "$OHMYZSH_REPO" "$HOME/.oh-my-zsh"; then
        log_success "Oh My Zsh 克隆成功"
    else
        log_error "Oh My Zsh 克隆失败"
        exit 1
    fi

    # 复制模板配置文件
    if [ -f "$HOME/.oh-my-zsh/templates/zshrc.zsh-template" ]; then
        cp "$HOME/.oh-my-zsh/templates/zshrc.zsh-template" "$HOME/.zshrc"
        log_success "配置文件已创建"
    else
        log_error "找不到模板配置文件"
        exit 1
    fi
}


# 显示安装完成信息
show_completion_info() {
    echo
    log_success "Oh My Zsh 安装完成！"
}

# 主函数
main() {
    echo "=========================================="
    echo "  Oh My Zsh 一键安装脚本 - 清华源版本"
    echo "=========================================="
    echo

    # 检查前置条件
    check_zsh_installed
    check_current_shell

    # 安装过程
    install_ohmyzsh
    show_completion_info
}

# 执行主函数
main "$@"
```

将上述脚本保存为 `install-oh-my-zsh.sh`，然后执行：

```bash
chmod u+x install-oh-my-zsh.sh
./install-oh-my-zsh.sh
```

---

GitHub 官方安装脚本：

```shell
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

其他第三方提供的安装方式：

```shell
sh -c "$(curl -fsSL https://gitee.com/shmhlsy/oh-my-zsh-install.sh/raw/master/install.sh)"
```

### oh-my-zsh 配置

oh-my-zsh 提供了很多插件，可以根据自己的需求安装，这里介绍几个常用的插件。

#### 主题 Theme

默认主题是 `robbyrussell`，可以变更为 `agnoster` 主题，需要修改 `~/.zshrc` 文件：

```shell
ZSH_THEME="agnoster"
```

也需要安装字体：

```shell
sudo apt-get install fonts-powerline
```

这两个均是最经典的主题，可以根据自己的偏好选择。

#### 插件 Plugins

使用 Gitee 资源安装插件

```bash
# zsh-syntax-highlighting 插件
git clone https://gitee.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# zsh-autosuggestions：自动建议
git clone https://gitee.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

# zsh-completions：命令补全
git clone https://gitee.com/wangnd/zsh-completions.git ${ZSH_CUSTOM:=~/.oh-my-zsh/custom}/plugins/zsh-completions

# autojump 自动跳转插件
sudo apt-get install autojump
```

需要编辑 `~/.zshrc` 文件以使得插件生效：

```shell
# 找到plugins=(...) 并修改
plugins=(
    git
    zsh-syntax-highlighting
    zsh-autosuggestions
    zsh-completions
    docker
)
# 初始化自动补全系统
autoload -U compinit && compinit

# 最后一行添加
. /usr/share/autojump/autojump.sh

```

最后，执行 `source ~/.zshrc` 使配置生效。

## 容器支持，Docker 刚好

Docker 是现代应用部署的标准方式，学习曲线平缓，功能强大。

### 安装 Docker

容器技术已经成为现代应用部署的标准方式，Docker 和 Kubernetes 是两个主要的容器编排工具。一句话论述：单机环境下，Docker 足够，并且是最佳的。

推荐使用云服务厂商提供的安装文档，本文使用的是腾讯云，可能无法跨云服务器使用，可自行搜索。

推荐查看腾讯云安装文档，因为本文并不能保证是最新的，安装步骤可能会有变化。

> 腾讯云安装 Docker https://cloud.tencent.com/document/product/1207/45596

添加 Docker 软件源

```bash
sudo apt-get update
sudo apt-get install ca-certificates curl -y
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://mirrors.cloud.tencent.com/docker-ce/linux/ubuntu/ \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |   sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

安装 Docker

```shell
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

检查 Docker

```shell
# 检查 Docker 服务状态
systemctl status docker
# 检查 Docker 信息
docker info
```

### 给普通用户增加权限

默认情况下，执行 docker 命令需要 sudo 权限，可以通过将用户添加到 docker 组来解决：

```bash
# 将当前用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或重新加载组权限
newgrp docker

# 验证权限
docker ps
```

### 配置国内镜像源

Docker 默认的镜像源是DockerHub，由于网络原因，建议配置国内镜像加速器。

```bash
# 创建Docker配置目录
sudo mkdir -p /etc/docker

# 配置镜像加速器（腾讯云、阿里云）
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.cn-hangzhou.aliyuncs.com"
  ]
}
EOF

# 重启Docker服务
sudo systemctl daemon-reload
sudo systemctl restart docker
```

使用 `docker info | grep "Registry Mirrors" && echo "镜像源配置成功"` 查看镜像源是否配置成功。


## 系统镜像

系统镜像（快照）是将系统当前状态保存为一个文件，后续可以直接使用这个镜像创建新的虚拟机，而不需要重复配置。无论是VMWare、阿里云还是腾讯云，均支持该服务。

上述章节中安装的基础软件，除了 ssh 私钥 id_ed25519 以及 git 基础配置，其余内容均是用户无关的，这也是可以轻松更新的。

因此，可以将系统当前状态保存为一个镜像，后续可以直接使用这个镜像创建新的虚拟机，作为开发环境的起点。

![tencentyun build image](/images/img-linux-guide/tencentyun-image.png)

腾讯云提供5个自定义镜像免费额度：

![tencentyun images](/images/img-linux-guide/tencentyun-image-free.png)

## 总结

本文是给国内开发运维人员用的云服务器配置指南，以Ubuntu 22.04系统为例。主要介绍了服务器环境下的必备软件，以及如何安装，内容包括：Git、zsh、oh-my-zsh、Docker，以及将系统制作为镜像（快照，或时间机器），便于迁移和分发，不再需要重复配置。

## 参考

1. Ubuntu系统下Oh My Zsh安装与配置全流程指南，https://comate.baidu.com/zh/page/4r7iiun4tmz
2. Ubuntu 命令行安装 zsh、oh-my-zsh、插件以及相关配置，https://convivae.top/posts/ubuntu-ming-ling-xing-an-zhuang-zsh-oh-my-zsh-cha-jian-yi-ji-xiang-guan-pei-zhi/
3. Docker 官方文档，https://docs.docker.com/
4. Ubuntu 22.04 官方文档，https://ubuntu.com/server/docs
5. oh-my-zsh Themes，https://github.com/ohmyzsh/ohmyzsh/wiki/themes
6. 腾讯云，安装 Docker 并配置镜像加速源，https://cloud.tencent.com/document/product/1207/45596