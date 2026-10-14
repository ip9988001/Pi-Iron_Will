import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话开始时加载入口指引
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const startHerePath = join(protocolDir, "START_HERE.md");
      const handoffChainPath = join(protocolDir, "HANDOFF_CHAIN.md");
      const newWindowPath = join(protocolDir, "NEW_WINDOW_HANDOFF_PROMPT.md");
      
      let context = "## 钢铁意志·PI版 入口指引\n\n";
      let statusText = "✓ 入口已加载";
      
      // 读取单一入口
      if (existsSync(startHerePath)) {
        const content = readFileSync(startHerePath, "utf-8");
        // 提取当前状态部分
        const statusMatch = content.match(/## 当前状态\n([\s\S]*?)(?=\n##|$)/);
        if (statusMatch) {
          context += "### 当前状态\n" + statusMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **入口文件不存在**，建议先执行02包\n\n";
        statusText = "⚠ 入口未找到";
      }
      
      // 读取接手链摘要
      if (existsSync(handoffChainPath)) {
        const content = readFileSync(handoffChainPath, "utf-8");
        // 提取第一次接手部分
        const firstMatch = content.match(/## 第一次接手\n([\s\S]*?)(?=\n##|$)/);
        if (firstMatch) {
          context += "### 最短接手链\n" + firstMatch[1] + "\n\n";
        }
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-gateway", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-gateway", "⚠ 错误");
      console.error("Steel Will Gateway Error:", e.message);
    }
  });
  
  // 注册查看入口命令
  pi.registerCommand("steel-will-entry", {
    description: "查看钢铁意志入口指引",
    handler: async (ctx: any) => {
      try {
        const startHerePath = join(protocolDir, "START_HERE.md");
        
        if (existsSync(startHerePath)) {
          const content = readFileSync(startHerePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("入口文件不存在，请先执行02包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`入口查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看接手链命令
  pi.registerCommand("steel-will-handoff", {
    description: "查看钢铁意志接手链",
    handler: async (ctx: any) => {
      try {
        const handoffChainPath = join(protocolDir, "HANDOFF_CHAIN.md");
        
        if (existsSync(handoffChainPath)) {
          const content = readFileSync(handoffChainPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("接手链文件不存在，请先执行02包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`接手链查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看交接提示词命令
  pi.registerCommand("steel-will-handoff-prompt", {
    description: "查看钢铁意志新窗口交接提示词",
    handler: async (ctx: any) => {
      try {
        const newWindowPath = join(protocolDir, "NEW_WINDOW_HANDOFF_PROMPT.md");
        
        if (existsSync(newWindowPath)) {
          const content = readFileSync(newWindowPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("交接提示词文件不存在，请先执行02包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`交接提示词查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册快速导航命令
  pi.registerCommand("steel-will-nav", {
    description: "钢铁意志快速导航",
    handler: async (ctx: any) => {
      try {
        let nav = "## 钢铁意志·PI版 快速导航\n\n";
        
        // 检查各个关键文件
        const files = [
          { path: "START_HERE.md", name: "单一入口", cmd: "/steel-will-entry" },
          { path: "HANDOFF_CHAIN.md", name: "接手链", cmd: "/steel-will-handoff" },
          { path: "NEW_WINDOW_HANDOFF_PROMPT.md", name: "交接提示词", cmd: "/steel-will-handoff-prompt" },
          { path: "goals/master-goal.md", name: "母目标", cmd: "/steel-will-status" },
          { path: "goals/current-stage.md", name: "当前阶段", cmd: "/steel-will-status" },
        ];
        
        for (const file of files) {
          const fullPath = join(memoryDir, file.path);
          const exists = existsSync(fullPath);
          nav += `- ${exists ? "✅" : "❌"} **${file.name}**: \`${file.path}\` ${exists ? `(${file.cmd})` : "(未创建)"}\n`;
        }
        
        // 检查已完成的包
        const stagesDir = join(memoryDir, "stages");
        if (existsSync(stagesDir)) {
          const { readdirSync } = require("fs");
          const stages = readdirSync(stagesDir).filter((f: string) => f.endsWith("-result.md"));
          nav += `\n### 已完成的包 (${stages.length}个)\n`;
          stages.forEach((s: string) => {
            nav += `- ${s}\n`;
          });
        }
        
        ctx.ui.notify(nav, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`导航查看失败: ${e.message}`, "error");
      }
    }
  });
}
