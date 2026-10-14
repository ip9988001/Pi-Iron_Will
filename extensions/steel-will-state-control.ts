import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话结束时提醒回写
  pi.on("session_end", async (event: any, ctx: any) => {
    try {
      const rulesPath = join(protocolDir, "ROUND_BACKWRITE_RULES.md");
      const trackerPath = join(protocolDir, "STAGE_TRACKER.md");
      
      if (existsSync(rulesPath)) {
        const rules = readFileSync(rulesPath, "utf-8");
        // 提取回写清单部分
        const checklistMatch = rules.match(/## 每轮必须更新的文件\n([\s\S]*?)(?=\n##|$)/);
        if (checklistMatch) {
          ctx.ui.notify("⚠️ 会话即将结束，请记得回写状态！", "warning");
          ctx.ui.notify("回写清单：\n" + checklistMatch[1], "info");
        }
      }
      
      // 检查是否有未完成的回写
      if (existsSync(trackerPath)) {
        const tracker = readFileSync(trackerPath, "utf-8");
        if (tracker.includes("进行中")) {
          ctx.ui.notify("⚠️ 检测到有进行中的包，请确认是否已回写！", "warning");
        }
      }
      
    } catch (e: any) {
      // 静默失败
      console.error("Steel Will State Control Error:", e.message);
    }
  });
  
  // 注册状态查看命令
  pi.registerCommand("steel-will-stage", {
    description: "查看钢铁意志阶段跟踪",
    handler: async (ctx: any) => {
      try {
        const trackerPath = join(protocolDir, "STAGE_TRACKER.md");
        
        if (existsSync(trackerPath)) {
          const content = readFileSync(trackerPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("阶段跟踪文件不存在，请先执行03包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`阶段查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册统一口径查看命令
  pi.registerCommand("steel-will-wording", {
    description: "查看钢铁意志统一口径",
    handler: async (ctx: any) => {
      try {
        const wordingPath = join(protocolDir, "UNIFIED_WORDING.md");
        
        if (existsSync(wordingPath)) {
          const content = readFileSync(wordingPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("统一口径文件不存在，请先执行03包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`统一口径查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册回写纪律查看命令
  pi.registerCommand("steel-will-rules", {
    description: "查看钢铁意志回写纪律",
    handler: async (ctx: any) => {
      try {
        const rulesPath = join(protocolDir, "ROUND_BACKWRITE_RULES.md");
        
        if (existsSync(rulesPath)) {
          const content = readFileSync(rulesPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("回写纪律文件不存在，请先执行03包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`回写纪律查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册回写执行命令
  pi.registerCommand("steel-will-backwrite", {
    description: "执行钢铁意志回写操作",
    handler: async (ctx: any) => {
      try {
        ctx.ui.notify("## 钢铁意志回写操作\n\n请按照以下步骤回写：", "info");
        
        let steps = "### 回写步骤\n\n";
        steps += "1. 更新 `STAGE_TRACKER.md`\n";
        steps += "   - 更新当前阶段\n";
        steps += "   - 更新已完成硬结果\n";
        steps += "   - 更新仍缺关键链路\n\n";
        
        steps += "2. 更新 `UNIFIED_WORDING.md`\n";
        steps += "   - 更新可以诚实宣称\n";
        steps += "   - 更新不能诚实宣称\n";
        steps += "   - 更新一句话统一口径\n\n";
        
        steps += "3. 更新 `goals/current-stage.md`\n";
        steps += "   - 同步当前阶段\n";
        steps += "   - 更新已完成基础\n";
        steps += "   - 更新仍缺关键链路\n\n";
        
        steps += "4. 创建 `stages/XX-包名-result.md`\n";
        steps += "   - 记录执行时间\n";
        steps += "   - 记录产物清单\n";
        steps += "   - 记录当前状态\n";
        steps += "   - 记录下一步\n\n";
        
        steps += "### 验证命令\n\n";
        steps += "```bash\n";
        steps += "# 检查阶段跟踪\n";
        steps += "cat ~/.pi/agent/memory/STAGE_TRACKER.md\n\n";
        steps += "# 检查统一口径\n";
        steps += "cat ~/.pi/agent/memory/UNIFIED_WORDING.md\n\n";
        steps += "# 检查当前阶段\n";
        steps += "cat ~/.pi/agent/memory/goals/current-stage.md\n\n";
        steps += "# 检查执行结果\n";
        steps += "ls ~/.pi/agent/memory/stages/\n";
        steps += "```";
        
        ctx.ui.notify(steps, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`回写操作失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册阶段更新命令
  pi.registerCommand("steel-will-update-stage", {
    description: "更新钢铁意志阶段状态",
    handler: async (ctx: any) => {
      try {
        const trackerPath = join(protocolDir, "STAGE_TRACKER.md");
        
        if (!existsSync(trackerPath)) {
          ctx.ui.notify("阶段跟踪文件不存在，请先执行03包", "warning");
          return;
        }
        
        const tracker = readFileSync(trackerPath, "utf-8");
        
        // 提取当前阶段
        const stageMatch = tracker.match(/## 当前阶段\n(.+)/);
        const stage = stageMatch ? stageMatch[1] : "未知阶段";
        
        ctx.ui.notify(`当前阶段: ${stage}\n\n请使用 `/steel-will-backwrite` 查看回写步骤`, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`阶段更新失败: ${e.message}`, "error");
      }
    }
  });
}
