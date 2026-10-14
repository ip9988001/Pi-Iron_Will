import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话开始时加载调度V2配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const taskGradingPath = join(protocolDir, "TASK_GRADING_POLICY.md");
      const rhythmPath = join(protocolDir, "RHYTHM_SCHEDULING_PROTOCOL.md");
      
      let context = "## 钢铁意志·PI版 调度V2\n\n";
      let statusText = "✓ 调度V2已加载";
      
      // 读取任务分级策略摘要
      if (existsSync(taskGradingPath)) {
        const content = readFileSync(taskGradingPath, "utf-8");
        // 提取L0-L3部分
        const l0Match = content.match(/## L0-L3 的复杂度语义\n([\s\S]*?)(?=\n##|$)/);
        if (l0Match) {
          context += "### 任务分级\n" + l0Match[1] + "\n\n";
        }
      } else {
        context += "⚠ **任务分级策略不存在**，建议先执行17包\n\n";
        statusText = "⚠ 调度V2未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-scheduler-v2", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-scheduler-v2", "⚠ 错误");
      console.error("Steel Will Scheduler V2 Error:", e.message);
    }
  });
  
  // 注册查看任务分级策略命令
  pi.registerCommand("steel-will-task-grading", {
    description: "查看钢铁意志任务分级策略",
    handler: async (ctx: any) => {
      try {
        const taskGradingPath = join(protocolDir, "TASK_GRADING_POLICY.md");
        
        if (existsSync(taskGradingPath)) {
          const content = readFileSync(taskGradingPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("任务分级策略不存在，请先执行17包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`任务分级策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看节律调度协议命令
  pi.registerCommand("steel-will-rhythm", {
    description: "查看钢铁意志节律调度协议",
    handler: async (ctx: any) => {
      try {
        const rhythmPath = join(protocolDir, "RHYTHM_SCHEDULING_PROTOCOL.md");
        
        if (existsSync(rhythmPath)) {
          const content = readFileSync(rhythmPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("节律调度协议不存在，请先执行17包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`节律调度协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看Heartbeat节律命令
  pi.registerCommand("steel-will-heartbeat-rhythm", {
    description: "查看钢铁意志Heartbeat节律",
    handler: async (ctx: any) => {
      try {
        const heartbeatRhythmPath = join(protocolDir, "HEARTBEAT_DAILY_SYNC_RHYTHM.md");
        
        if (existsSync(heartbeatRhythmPath)) {
          const content = readFileSync(heartbeatRhythmPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("Heartbeat节律不存在，请先执行17包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`Heartbeat节律查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看反射GC节律命令
  pi.registerCommand("steel-will-reflection-rhythm", {
    description: "查看钢铁意志反射GC节律",
    handler: async (ctx: any) => {
      try {
        const reflectionRhythmPath = join(protocolDir, "REFLECTION_GC_RHYTHM.md");
        
        if (existsSync(reflectionRhythmPath)) {
          const content = readFileSync(reflectionRhythmPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("反射GC节律不存在，请先执行17包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`反射GC节律查看失败: ${e.message}`, "error");
      }
    }
  });
}
