import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话开始时加载操作控制台
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const consolePath = join(protocolDir, "OPERATIONS_CONSOLE.md");
      const liveSurfacePath = join(protocolDir, "LIVE_MEMORY_SURFACE.md");
      const actionCardPath = join(protocolDir, "DEFAULT_ACTION_CARD.md");
      
      let context = "## 钢铁意志·PI版 调度控制\n\n";
      let statusText = "✓ 调度已加载";
      
      // 读取操作控制台摘要
      if (existsSync(consolePath)) {
        const content = readFileSync(consolePath, "utf-8");
        // 提取启动后的first move部分
        const firstMoveMatch = content.match(/## 启动后的 first move\n([\s\S]*?)(?=\n##|$)/);
        if (firstMoveMatch) {
          context += "### 启动流程\n" + firstMoveMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **操作控制台不存在**，建议先执行04包\n\n";
        statusText = "⚠ 调度未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-scheduler", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-scheduler", "⚠ 错误");
      console.error("Steel Will Scheduler Error:", e.message);
    }
  });
  
  // 注册查看操作控制台命令
  pi.registerCommand("steel-will-console", {
    description: "查看钢铁意志操作控制台",
    handler: async (ctx: any) => {
      try {
        const consolePath = join(protocolDir, "OPERATIONS_CONSOLE.md");
        
        if (existsSync(consolePath)) {
          const content = readFileSync(consolePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("操作控制台不存在，请先执行04包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`操作控制台查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看实时记忆面命令
  pi.registerCommand("steel-will-surface", {
    description: "查看钢铁意志实时记忆面",
    handler: async (ctx: any) => {
      try {
        const liveSurfacePath = join(protocolDir, "LIVE_MEMORY_SURFACE.md");
        
        if (existsSync(liveSurfacePath)) {
          const content = readFileSync(liveSurfacePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("实时记忆面不存在，请先执行04包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`实时记忆面查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看默认动作卡命令
  pi.registerCommand("steel-will-action", {
    description: "查看钢铁意志默认动作卡",
    handler: async (ctx: any) => {
      try {
        const actionCardPath = join(protocolDir, "DEFAULT_ACTION_CARD.md");
        
        if (existsSync(actionCardPath)) {
          const content = readFileSync(actionCardPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("默认动作卡不存在，请先执行04包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`默认动作卡查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册快速启动命令
  pi.registerCommand("steel-will-start", {
    description: "钢铁意志快速启动",
    handler: async (ctx: any) => {
      try {
        let startup = "## 钢铁意志·PI版 快速启动\n\n";
        
        // 检查各个关键文件
        const files = [
          { path: "START_HERE.md", name: "单一入口", cmd: "/steel-will-entry" },
          { path: "goals/current-stage.md", name: "当前阶段", cmd: "/steel-will-status" },
          { path: "STAGE_TRACKER.md", name: "阶段跟踪", cmd: "/steel-will-stage" },
          { path: "OPERATIONS_CONSOLE.md", name: "操作控制台", cmd: "/steel-will-console" },
          { path: "LIVE_MEMORY_SURFACE.md", name: "实时记忆面", cmd: "/steel-will-surface" },
          { path: "DEFAULT_ACTION_CARD.md", name: "默认动作卡", cmd: "/steel-will-action" },
        ];
        
        for (const file of files) {
          const fullPath = join(memoryDir, file.path);
          const exists = existsSync(fullPath);
          startup += `- ${exists ? "✅" : "❌"} **${file.name}**: \`${file.path}\` ${exists ? `(${file.cmd})` : "(未创建)"}\n`;
        }
        
        // 读取当前阶段
        const currentStagePath = join(memoryDir, "goals/current-stage.md");
        if (existsSync(currentStagePath)) {
          const content = readFileSync(currentStagePath, "utf-8");
          const stageMatch = content.match(/## 当前阶段\n(.+)/);
          if (stageMatch) {
            startup += `\n### 当前阶段\n${stageMatch[1]}\n`;
          }
        }
        
        ctx.ui.notify(startup, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`快速启动失败: ${e.message}`, "error");
      }
    }
  });
}
