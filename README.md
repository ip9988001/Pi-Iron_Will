# Pi - Iron Will —— 钢铁意志 完整框架系统（外挂层）

> **这是 pi 底座的外挂系统「钢铁意志」的完整框架文件备份。**
> 一行命令即可外接到任何一台已装 pi 的机器上，让一个裸 pi 变强。

---

## ⚠️ 前置条件：必须先有 pi-Agent 底座

**本仓库是「外挂层」，不含底座。** 没有 pi 底座，这里的扩展、技能、宪法、引擎一行都跑不起来。

先把底座装上，再谈外挂：

| 项目 | 地址 |
|---|---|
| **pi-Agent 官网**（安装脚本 / 文档） | **https://pi.dev** |
| **pi-Agent 官方 GitHub 仓库** | **https://github.com/earendil-works/pi** |

```bash
curl -fsSL https://pi.dev/install.sh | sh    # 装 pi 底座，约 11 秒
export PATH="$HOME/.pi/agent/bin:$PATH"      # 装完按提示执行这句
pi --version                                 # 能打印版本 = 底座就位，可以接外挂了
```

> 顺序铁律：**先 pi 底座 → 再跑 attach.sh**。反过来一定会失败，且失败原因全是「找不到 pi」。

## 它是什么

pi-Agent 是底座，本身**没有任何记忆能力** —— 每开一个新会话就是一张白纸。
「钢铁意志」是架在它上面的一整套外挂：

- **记忆三层**：L1 原始日志 → L2 精炼 → L3 wiki 合成 + 向量检索
- **wiki 四类**：entities / concepts / sources / synthesis + playbooks 剧本库
- **37 个自研扩展**（`steel-will-*`，全量启用，接入即在跑）—— 完整清单见下方《37 个扩展 · 全景》
- **行为宪法**：阶梯规则、铁律、静默令、抓取决策阶梯、编码阶梯
- **技能库**：35 个技能（含 `steel-will-*` 自研技能与 browser-tools / edge-tts / github-get / hyperframes / pi-web-restart）
- **自动运维**：L1 Watcher + 定时精炼 / 体检 / 备份

## 37 个扩展 · 全景

接入即全部加载（`attach.sh` 不再保留"停用"状态）。经沙盒回归测试：**37/37 可加载、113 条命令、零冲突**。

| # | 扩展 | 作用 |
|---|---|---|
| 1 | `steel-will-recall-tool` | 核心检索工具 `recall_memory` + workspace 多工作区管理（全局/项目隔离） |
| 2 | `steel-will-30-wiki-engine` | Wiki 引擎：entities/concepts/sources/synthesis 四类页面的读写、索引与日志 |
| 3 | `steel-will-32-auto-trigger` | 自动触发器：扫描候选池 → 按规则自动晋升为 L2/L3 |
| 4 | `steel-will-33-lint-system` | Wiki 体检：断链、孤儿页、结构问题诊断并出报告 |
| 5 | `steel-will-34-temporal` | 时间索引：事实有效期窗口 + 取代链，过时记忆检索时自动降权 |
| 6 | `steel-will-35-self-status` | 自知之明：一体式自述、记忆分布、沉睡条目盘点 |
| 7 | `steel-will-achievement-motivator` | 成就激励与动机加成，附带 token ROI 账本 |
| 8 | `steel-will-adjudicator` | 冲突裁决庭：冲突暴露、取代声明、过时判定、裁决台账 |
| 9 | `steel-will-autonomic-nervous` | 自主神经系统：认知过载抑制 + 动态 token 压榨微调 |
| 10 | `steel-will-auto-promoter` | 自动晋升管道 V2：L1 原始日志 → L2 精华提炼（定时增量） |
| 11 | `steel-will-bootstrap` | 开机引导：初始化、状态自检、母目标注入 |
| 12 | `steel-will-candidate-screener` | 候选筛选器：心跳扫描候选池、分级与筛选 |
| 13 | `steel-will-clone-imprint` | 克隆印记：任务模式图灵闭环校验 |
| 14 | `steel-will-codegraph` | 代码图谱引擎：符号搜索、依赖分析、调用链追踪 |
| 15 | `steel-will-experience-injector` | 经验注入器：按场景把经验包注入上下文 |
| 16 | `steel-will-failure-learner` | 失败学习器：失败案例、反模式、坑，回写成教训条目 |
| 17 | `steel-will-forge` | 零号工厂：迭代车间与底层代码资产熔铸炉 |
| 18 | `steel-will-gateway` | 登机口：新窗口入口指引、交接卡、导航图 |
| 19 | `steel-will-governance` | 治理层：风险分级、行动预检、保护模式、审计账本 |
| 20 | `steel-will-hallucination-eliminator` | 幻觉剔除手术 + 四重冗余逻辑校验，带可信元数据 |
| 21 | `steel-will-heartbeat` | 心跳：续接快照、恢复卡、快速恢复上一段现场 |
| 22 | `steel-will-l1-logger` | L1 原始日志采集：会话 → 日志，附语义检索钩子 |
| 23 | `steel-will-long-term` | 长期记忆：L3 路由、向量化、长期规则 |
| 24 | `steel-will-memory-skeleton` | 记忆骨架：域划分、目录地图、结构自检 |
| 25 | `steel-will-migration` | 迁移与验收：引导部署、冒烟测试、样例数据 |
| 26 | `steel-will-ontology` | 本体论：术语规范、schema、锚点、品牌与子系统地图 |
| 27 | `steel-will-reflection` | 反思系统：精华提炼、闭环判定、可复用流程沉淀 |
| 28 | `steel-will-retrieval` | 检索层：索引构建、词法回退、记忆索引维护 |
| 29 | `steel-will-scheduler` | 操作控制台：节奏调度、行动卡、常驻巡航 |
| 30 | `steel-will-scheduler-v2` | 调度 V2：任务分级、心跳/反思/任务节律编排 |
| 31 | `steel-will-security` | 边界层：读取边界规则、审批流、偏好管理 |
| 32 | `steel-will-sensory` | 感官层：宿主预检、宿主保护反应、感知采样 |
| 33 | `steel-will-state-control` | 状态控制：阶段推进、措辞规范、会话结束回写提醒 |
| 34 | `steel-will-subconscious` | 潜意识：自发式编排与动态重规划算力栈 |
| 35 | `steel-will-swarm` | 蜂群：多智能体协作、任务派发、授权清单 |
| 36 | `steel-will-transcendence` | 幽灵复刻协议：灵魂清单 + 跨域灾难重生序列 |
| 37 | `steel-will-vector-radar` | 向量语义雷达：降维捕获网、读取预算控制 |

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
git clone https://github.com/ip9988001/Pi-Iron_Will.git ~/Pi-Iron_Will && bash ~/Pi-Iron_Will/attach.sh --yes
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
├── extensions/            # 37 个 steel-will-* 扩展（全量启用，接入即全部在跑）
├── skills/                # PI-技能库（35 个技能）
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
