import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const sensoryDir = join(memoryDir, "sensory_cortex");
  
  // 会话开始时加载感知配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(sensoryDir)) {
        mkdirSync(sensoryDir, { recursive: true });
      }
      
      const sensoryPath = join(protocolDir, "RUNTIME_SENSORY_POLICY.md");
      const preflightPath = join(protocolDir, "SOMATIC_PREFLIGHT_RULES.md");
      
      let context = "## 钢铁意志·PI版 感知系统\n\n";
      let statusText = "✓ 感知已加载";
      
      // 读取运行时感知策略摘要
      if (existsSync(sensoryPath)) {
        const content = readFileSync(sensoryPath, "utf-8");
        // 提取什么时候启用感知输入部分
        const sensoryMatch = content.match(/## 什么时候启用感知输入\n([\s\S]*?)(?=\n##|$)/);
        if (sensoryMatch) {
          context += "### 感知触发\n" + sensoryMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **运行时感知策略不存在**，建议先执行20包\n\n";
        statusText = "⚠ 感知未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-sensory", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-sensory", "⚠ 错误");
      console.error("Steel Will Sensory Error:", e.message);
    }
  });
  
  // 注册查看运行时感知策略命令
  pi.registerCommand("steel-will-sensory", {
    description: "查看钢铁意志运行时感知策略",
    handler: async (ctx: any) => {
      try {
        const sensoryPath = join(protocolDir, "RUNTIME_SENSORY_POLICY.md");
        
        if (existsSync(sensoryPath)) {
          const content = readFileSync(sensoryPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("运行时感知策略不存在，请先执行20包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`运行时感知策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看宿主预检规则命令
  pi.registerCommand("steel-will-somatic-preflight", {
    description: "查看钢铁意志宿主预检规则",
    handler: async (ctx: any) => {
      try {
        const preflightPath = join(protocolDir, "SOMATIC_PREFLIGHT_RULES.md");
        
        if (existsSync(preflightPath)) {
          const content = readFileSync(preflightPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("宿主预检规则不存在，请先执行20包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`宿主预检规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看宿主保护反应规则命令
  pi.registerCommand("steel-will-host-protection", {
    description: "查看钢铁意志宿主保护反应规则",
    handler: async (ctx: any) => {
      try {
        const protectionPath = join(protocolDir, "HOST_PROTECTION_REACTION_RULES.md");
        
        if (existsSync(protectionPath)) {
          const content = readFileSync(protectionPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("宿主保护反应规则不存在，请先执行20包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`宿主保护反应规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看感知样本命令
  pi.registerCommand("steel-will-sensory-sample", {
    description: "查看钢铁意志感知样本",
    handler: async (ctx: any) => {
      try {
        const samplePath = join(sensoryDir, "sample-sensory.md");
        
        if (existsSync(samplePath)) {
          const content = readFileSync(samplePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("感知样本不存在", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`感知样本查看失败: ${e.message}`, "error");
      }
    }
  });
}
