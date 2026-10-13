# Pi - Iron Will —— 钢铁意志 完整框架系统（外挂层）

> **这是 pi 底座的外挂系统「钢铁意志」的完整框架文件备份。**
> 一行命令即可外接到任何一台已装 pi 的机器上，让一个裸 pi 变强。

## 它是什么

pi-Agent 是底座，本身**没有任何记忆能力** —— 每开一个新会话就是一张白纸。
「钢铁意志」是架在它上面的一整套外挂：

- **记忆三层**：L1 原始日志 → L2 精炼 → L3 wiki 合成 + 向量检索
- **wiki 四类**：entities / concepts / sources / synthesis + playbooks 剧本库
- **22 个自研扩展**（`steel-will-*`）：wiki 引擎、自动触发、lint、temporal、self-status、
  成就动机、自主神经、auto-promoter、candidate-screener、clone-imprint、codegraph、
  forge、hallucination-eliminator、heartbeat、l1-logger、long-term、recall-tool、
  state-control、subconscious、transcendence、vector-radar
- **行为宪法**：阶梯规则、铁律、静默令、抓取决策阶梯、编码阶梯
- **技能库**：30+ 个 `steel-will-*` 技能 + browser-tools / edge-tts / github-get /
  hyperframes / pi-web-restart
- **自动运维**：L1 Watcher + 定时精炼 / 体检 / 备份

## 与另一个仓库的区别

| 仓库 | 装什么 | 谁能用 |
|---|---|---|
| **`pi-gangtieyizhi`**（本仓库） | **框架本体**：扩展、技能、引擎脚本、宪法、模板 | **可分发**。任何一台装了 pi 的机器都能外接，不含私人记忆与凭据 |
| `pi-xinxin` | **完整本体备份**：上面这些 **+ 记忆库 + 会话历史 + 凭据 + 服务定义** | 只用于我自己的整体复活 |

一句话：**这个仓库是「引擎」，那个仓库是「这台装了引擎的车」。**

## 一行外接（已在全新机器实测）

前提只有一条：机器上已有 **pi 底座**（`pi --version` 能跑）。没有就先装：

```bash
curl -fsSL https://pi.dev/install.sh | sh   # 装 pi 底座，约 11 秒
export PATH="$HOME/.pi/agent/bin:$PATH"     # 装完按提示执行这句
```

然后一行外接：

```bash
git clone https://github.com/ip9988001/pi-gangtieyizhi.git ~/pi-gangtieyizhi && bash ~/pi-gangtieyizhi/attach.sh --yes
```

- `bash attach.sh` —— 交互式，会询问 key（**全部可以跳过**）
- `bash attach.sh --yes` —— 全自动，key 从环境变量取
- `GLM_API_KEY=xxx bash attach.sh` —— 预先给 key

`attach.sh` 实际完成的 9 步（零 key 机器实测 2 分 10 秒跑完，exit=0）：

| 步骤 | 做什么 |
|---|---|
| 0/9 | 前置检查：pi 底座 / python3 / node + **模型可用性预检**（没配模型会提前给出修法） |
| 1/9 | 调 `deps.sh` 扫描依赖并按发行版自动安装（官方源失败自动切国内源） |
| 2/9 | 备份机器上已有的 `AGENTS.md` / `settings.json` / 配置 |
| 3/9 | 装框架文件：扩展、技能库、宪法、引擎、约束层（**已存在的同名文件不覆盖**） |
| 4/9 | 建记忆骨架（L1 / wiki / candidates / system / protocols），补入 108 份协议文档 |
| 5/9 | 配置 key（可全跳过）+ 创建密钥汇总表 + **自动把 pi 驱动模型的 key 登记进去** |
| 6/9 | 注册 `settings.json`（packages / extensions）与 MCP |
| 7/9 | 补齐 npm 依赖（`@xenova/transformers` / `vectra`） |
| 8/9 | 装 systemd 单元（l1-watcher 常驻 + l1-refine.timer 每日 04:00）；非 systemd 环境自动跳过 |
| 9/9 | 验证 + 预热 pi 底座 + **真实调用一次提炼线路**，失败时打印可执行的修复步骤 |

## 目录结构

```
pi-gangtieyizhi/
├── README.md              # 本文件
├── KEYS.md                # 密钥清单、密钥汇总表与五级兜底规则
├── DEPENDENCIES.md        # 依赖总清单（裸机假设）+ 官方/国内双下载源表
├── attach.sh              # 一行外接脚本（9 步全自动）
├── deps.sh                # 依赖扫描 / 自动安装 / 镜像源探测
├── extensions/            # 22 个启用的 steel-will-* 扩展
├── extensions-disabled/   # 15 个已停用扩展（保留可秒恢复）
├── skills/                # PI-技能库（33 个技能）
├── constitution/          # AGENTS.md / SYSTEM.md / 0-AGENTS / protocols（108 份协议文档）/ goals-template
├── engine/                # bin/（l1_watcher.py 等）services/ scripts/ aux/ pi-extensions/
├── config/                # settings / l1_watcher.config.example / STEEL-WILL-KEYS.example / mcp-adapter / package.json
└── systemd/               # 框架自身的服务与定时器（l1-watcher / l1-refine）
```

## 外接脚本的 9 步

| 步 | 动作 |
|---|---|
| 0 | 前置检查（pi / python3 / node） |
| 1 | **依赖扫描 + 自动安装**（调 `deps.sh`：先 scan 列出缺什么，再 install；带 `--with-optional` 连技能依赖一起装） |
| 2 | 备份已有配置到 `~/.pi/agent-attach-backup-<时间戳>` |
| 3 | 安装框架文件（**同名不覆盖**，保护本机已有改动） |
| 4 | 建立记忆骨架（补 108 份协议文档，**只补不覆盖**） |
| 5 | 密钥汇总表 + key 配置 + **自动登记 pi 驱动模型 key** |
| 6 | 注册 settings 与 MCP |
| 7 | 补齐 npm 依赖 |
| 8 | 安装并启动 systemd 服务与定时器 |
| 9 | 验证（含 pi 底座预热自检 + 提炼线路自测） |

## 依赖与镜像

`deps.sh` 会先扫机器现状，再只装缺的：

```bash
bash deps.sh scan                     # 只扫描，不改系统
bash deps.sh install                  # 装缺失核心依赖
bash deps.sh install --with-optional  # 连技能依赖一起装
bash deps.sh mirrors                  # 看本机选中的下载源
```

**每个生态都有官方 + 国内镜像两条路，自动探测连通性择优**：

| 生态 | 官方 | 国内镜像 |
|---|---|---|
| PyPI | pypi.org | 清华 / 阿里云 / 腾讯云 |
| npm | registry.npmjs.org | npmmirror / 腾讯云 |
| apt | 发行版官方 | 清华 / 阿里 / 中科大 |
| GitHub | github.com | ghfast.top / gh-proxy.com / ghproxy.net |
| Node | nodejs.org | npmmirror.com/mirrors/node |

识别到国内网络环境（时区 CST）会自动**镜像优先 + 延长超时**。
包管理器自动识别：apt / dnf / yum / apk / pacman / zypper / brew。

## 关键特性：零 key 也能跑

提炼引擎是**四级容灾链**：`GLM → GLM(关思考) → DeepSeek → pi 底座驱动模型`。

第四级调用 `pi -p`，**不需要任何外部 API key** —— 只要 pi 底座能跑，记忆提炼就能跑。
所以本框架在完全裸的机器上、一个 key 都不配的情况下，也能全功能正常运行。
