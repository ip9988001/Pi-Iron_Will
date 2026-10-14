import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const reflectionsDir = join(memoryDir, "reflections");
  
  // 会话开始时加载反思配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(reflectionsDir)) {
        mkdirSync(reflectionsDir, { recursive: true });
      }
      
      const essencePath = join(protocolDir, "ESSENCE_REFINEMENT_PROTOCOL.md");
      const closurePath = join(protocolDir, "CLOSURE_JUDGMENT_RULES.md");
      
      let context = "## 钢铁意志·PI版 反思系统\n\n";
      let statusText = "✓ 反思已加载";
      
      // 读取精华提炼协议摘要
      if (existsSync(essencePath)) {
        const content = readFileSync(essencePath, "utf-8");
        // 提取Nightly Reflection部分
        const reflectionMatch = content.match(/## Nightly Reflection 要提取哪些精华字段\n([\s\S]*?)(?=\n##|$)/);
        if (reflectionMatch) {
          context += "### 精华字段\n" + reflectionMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **精华提炼协议不存在**，建议先执行11包\n\n";
        statusText = "⚠ 反思未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-reflection", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-reflection", "⚠ 错误");
      console.error("Steel Will Reflection Error:", e.message);
    }
  });
  
  // 注册查看精华提炼协议命令
  pi.registerCommand("steel-will-essence", {
    description: "查看钢铁意志精华提炼协议",
    handler: async (ctx: any) => {
      try {
        const essencePath = join(protocolDir, "ESSENCE_REFINEMENT_PROTOCOL.md");
        
        if (existsSync(essencePath)) {
          const content = readFileSync(essencePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("精华提炼协议不存在，请先执行11包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`精华提炼协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看闭环判断规则命令
  pi.registerCommand("steel-will-closure", {
    description: "查看钢铁意志闭环判断规则",
    handler: async (ctx: any) => {
      try {
        const closurePath = join(protocolDir, "CLOSURE_JUDGMENT_RULES.md");
        
        if (existsSync(closurePath)) {
          const content = readFileSync(closurePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("闭环判断规则不存在，请先执行11包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`闭环判断规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看可复用流程晋升规则命令
  pi.registerCommand("steel-will-reusable", {
    description: "查看钢铁意志可复用流程晋升规则",
    handler: async (ctx: any) => {
      try {
        const reusablePath = join(protocolDir, "REUSABLE_FLOW_PROMOTION_RULES.md");
        
        if (existsSync(reusablePath)) {
          const content = readFileSync(reusablePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("可复用流程晋升规则不存在，请先执行11包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`可复用流程晋升规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看深提炼记录命令
  pi.registerCommand("steel-will-reflections", {
    description: "查看钢铁意志深提炼记录",
    handler: async (ctx: any) => {
      try {
        if (!existsSync(reflectionsDir)) {
          ctx.ui.notify("深提炼记录目录不存在", "warning");
          return;
        }
        
        const { readdirSync } = require("fs");
        const files = readdirSync(reflectionsDir).filter((f: string) => f.endsWith(".md"));
        
        if (files.length === 0) {
          ctx.ui.notify("暂无深提炼记录", "warning");
          return;
        }
        
        let output = "## 钢铁意志·PI版 深提炼记录\n\n";
        output += `**记录目录**: ${reflectionsDir}\n\n`;
        output += `**记录文件**: ${files.length}个\n\n`;
        
        files.forEach((file: string) => {
          output += `- ${file}\n`;
        });
        
        ctx.ui.notify(output, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`深提炼记录查看失败: ${e.message}`, "error");
      }
    }
  });
}
