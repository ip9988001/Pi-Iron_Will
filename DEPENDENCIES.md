# 钢铁意志 · PI 版 —— 依赖总清单（**裸机假设**）

> 核验日期 2026-10-08。
> **本表按「目标机器什么都没装」编写** —— 不因为开发机上装了就不统计。
> `deps.sh` 按本表自动扫描 + 自动安装；`attach.sh` 第 1 步调用它。

## 〇、一句话结论

| 层 | 裸机上需要什么 | 谁能装 |
|---|---|---|
| 系统包 | python3 / curl / wget / git / ca-certificates / unzip / tar / gzip / jq / rsync / gcc | `deps.sh install`（按发行版自动选包名） |
| Node | node ≥ 20（**pi 安装器通常自带**） | pi 自带或 `deps.sh` 提示 |
| Python 包 | **核心 0 个**（引擎纯标准库） | —— |
| Node 包 | `@xenova/transformers` `vectra` `pi-mcp-adapter` | `npm install`（走镜像） |
| pi 自带包 | `@earendil-works/pi-coding-agent` `typebox` `jiti` | **不用装** |
| 外部二进制 | 全部**可选**，只为额外技能服务 | `deps.sh install --with-optional` |

---

## 一、系统层（按发行版自动映射包名）

| 能力 | Debian/Ubuntu | RHEL/CentOS/Fedora | Alpine | Arch |
|---|---|---|---|---|
| Python 3 | `python3` | `python3` | `python3` | `python3` |
| pip | `python3-pip` | `python3-pip` | `py3-pip` | `python-pip` |
| venv | `python3-venv` | `python3-virtualenv` | （内置） | （内置） |
| HTTP | `curl` `wget` | 同 | 同 | 同 |
| Git | `git` | `git` | `git` | `git` |
| 证书 | `ca-certificates` | `ca-certificates` | `ca-certificates` | `ca-certificates` |
| 压缩 | `unzip` `tar` `gzip` | 同 | 同 | 同 |
| JSON | `jq` | `jq` | `jq` | `jq` |
| 同步 | `rsync` | `rsync` | `rsync` | `rsync` |
| 编译 | `build-essential` | `gcc-c++ make` | `build-base` | `base-devel` |
| 时区 | `tzdata` | `tzdata` | `tzdata` | `tzdata` |

**`deps.sh` 能自动识别的包管理器**：`apt` / `dnf` / `yum` / `apk` / `pacman` / `zypper` / `brew`（macOS）/ `winget`（Windows / Git Bash）

**Windows 原生**：走 `attach.ps1`，依赖用 winget 装（Python / Node），服务用「计划任务」替代 systemd：

```powershell
winget install Python.Python.3.12     # 记忆提炼必需
winget install OpenJS.NodeJS.LTS      # npm 依赖必需
winget install Git.Git                # 可选
```
通过 `/etc/os-release` 的 `ID` 判断，`uname -m` 判断架构。

---

## 二、Python 层

| 文件 | 第三方依赖 | 说明 |
|---|---|---|
| `engine/bin/l1_watcher.py` | **无（纯标准库）** ✅ | 会话采集 + 记忆提炼，核心中的核心 |
| `engine/scripts/refresh_skill_catalog.py` | 无 ✅ | |
| `engine/scripts/voice-server.py` | 无（标准库 socketserver）✅ | |
| `engine/aux/sync_daemon.py` | 无 ✅ | |

**可选 Python 包**

| 包 | 谁需要 | 装法 |
|---|---|---|
| `edge-tts` | 语音技能 | `pip install edge-tts` |
| `pillow` `numpy` `imageio` | slack-gif-creator 技能 | `--with-optional` |
| `pypdf` `pdfplumber` `pdf2image` | pdf 技能 | `--with-optional` |
| `openpyxl` `lxml` `defusedxml` | xlsx / docx / pptx 技能 | `--with-optional` |
| `pyyaml` | skill-creator | `--with-optional` |
| `playwright` | webapp-testing | `--with-optional` + `playwright install` |

---

## 三、Node 层

**框架自己声明**（`config/package.json`，`npm install` 装）：

| 包 | 版本 | 用途 |
|---|---|---|
| `@xenova/transformers` | `^2.17.2` | 本地向量化 |
| `vectra` | `^0.15.0` | 本地向量库 |
| `pi-mcp-adapter` | `^2.10.0` | MCP 适配（可选） |

传递依赖需允许安装脚本：`sharp@0.32.6`、`protobufjs@6/7/8`（已写在 `allowScripts`）

**pi 底座自带（在 `~/.pi/agent/install/releases/<版本>/node_modules/`，**不要重复装**）**：
`@earendil-works/pi-coding-agent`（15 个扩展 import）· `typebox`（8 个扩展）· `jiti`（引擎自检）

**Node 运行时**：pi 托管安装自带，位于 `$XDG_DATA_HOME/pi-node/current/bin`，**不在系统 PATH 上**。
`l1_watcher._llm_via_pi()` 与 `deps.sh` 都会自动把它补进 PATH。

---

## 四、外部二进制（全部可选）

| 工具 | 谁需要 | 官方源 | 国内镜像 |
|---|---|---|---|
| `rtk` | Shell 输出压缩 | GitHub release | `ghfast.top` / `gh-proxy.com` / `ghproxy.net` 前缀加速 |
| `lightpanda` | JS 执行引擎 | GitHub release | 同上 |
| `lean-ctx` | 上下文压缩 | `npm i -g lean-ctx-bin` | `registry.npmmirror.com` |
| `ast-grep` | 结构搜索 | `npm i -g @ast-grep/cli` | `registry.npmmirror.com` |
| `scrapling` / `scrapling-mcp` | 网页抓取 | PyPI | 清华 / 阿里 / 腾讯 PyPI |
| `yt-dlp` / `tvly` / `bili` | 杂项 | PyPI | 同上 |
| `agent-reach` | 13 平台内容获取 | 其仓库 | GitHub 加速前缀 |
| `playwright` 浏览器 | 浏览器自动化 | CDN | `PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright` |
| `fd` | 文件查找 | apt/dnf | 系统镜像源 |

---

## 五、★ 双下载源表（官方 + 国内镜像）

`deps.sh` 会**先探测连通性再选源**：优先国内镜像，不通则回落官方。

| 生态 | 官方源 | 国内镜像（按优先顺序） |
|---|---|---|
| **PyPI** | `https://pypi.org/simple` | ① `https://pypi.tuna.tsinghua.edu.cn/simple`（清华）<br>② `https://mirrors.aliyun.com/pypi/simple`（阿里）<br>③ `https://mirrors.cloud.tencent.com/pypi/simple`（腾讯） |
| **npm** | `https://registry.npmjs.org` | ① `https://registry.npmmirror.com`（阿里）<br>② `https://mirrors.cloud.tencent.com/npm` |
| **apt** | 发行版官方 | ① `https://mirrors.tuna.tsinghua.edu.cn`（清华）<br>② `https://mirrors.aliyun.com`（阿里）<br>③ `https://mirrors.ustc.edu.cn`（中科大） |
| **GitHub 资源** | `https://github.com` | ① `https://ghfast.top`<br>② `https://gh-proxy.com`<br>③ `https://ghproxy.net`（均为前缀式：`<镜像>/https://github.com/...`） |
| **Node 发行版** | nodejs.org | `https://npmmirror.com/mirrors/node` |
| **Playwright 浏览器** | Microsoft CDN | `https://npmmirror.com/mirrors/playwright` |
| **Docker 镜像** | Docker Hub | 阿里云 / 腾讯云容器镜像（本项目不需要） |

**默认行为**：一次安装只用 per-command 参数（`pip -i`、`npm --registry`），**不改写系统全局配置**。
需要固化到全局时：`bash deps.sh mirrors --apply-global`
（会写 `~/.config/pip/pip.conf` 与 `npm config set registry`；**apt 源不自动改写**，风险高）

---

## 六、`deps.sh` 命令

```bash
bash deps.sh scan                        # 只扫描：环境/命令/py包/node包/二进制/框架自检
bash deps.sh install                     # 装缺失的核心依赖
bash deps.sh install --with-optional     # 连可选技能依赖一起装
bash deps.sh mirrors                     # 打印本机选定的镜像源
bash deps.sh mirrors --apply-global      # 固化镜像到 pip/npm 全局配置
```

**scan 输出分 6 段**：环境 / 命令依赖 / Node·npm / Python 包 / Node 包 / 可选外部二进制 / 框架自检。
每项标 `✓ 已装`、`! 缺失（可选）`、`✗ 缺失（必需）`。

---

## 七、第四/五级兜底的前置条件

提炼引擎第五级走 `pi -p`，需要：

1. `pi` 可执行文件在 PATH 或 `~/.pi/agent/bin/pi`
2. **`node` 可用** —— pi 托管 node 在 `$XDG_DATA_HOME/pi-node/current/bin`，**不在系统 PATH**；
   `_llm_via_pi()` 已自动补 PATH（否则 `pi` 以 127 退出，报 `/usr/bin/env: 'node': No such file`）
3. pi 底座自身可用（首次 `pi -p` 会拉技能包，需要网络）
4. pi 已配好基础 provider

## 八、目录骨架（attach.sh 自动创建）

```
~/.pi/agent/
├── AGENTS.md  SYSTEM.md  0-AGENTS/
├── extensions/（37，全量启用）  PI-技能库/（33）
├── bin/  services/  scripts/  assets/  .pi/extensions/rtk.ts
├── STEEL-WILL-KEYS.md          # 密钥汇总表（600）
├── l1_watcher.config.json      # 兼容配置（600）
└── memory/{l1,wiki,wiki_candidates/pending,agent,candidates,system,goals,stages,reflections,archive/protocols}
```
