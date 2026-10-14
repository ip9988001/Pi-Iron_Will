import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const bundlesDir = join(memoryDir, "bundles");
  
  // 会话开始时加载Experience Injector配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(bundlesDir)) {
        mkdirSync(bundlesDir, { recursive: true });
      }
      
      const bundlePath = join(protocolDir, "EXPERIENCE_BUNDLE_SCHEMA.md");
      const triggerPath = join(protocolDir, "TRIGGER_POLICY.md");
      
      let context = "## 钢铁意志·PI版 经验注入\n\n";
      let statusText = "✓ 经验已加载";
      
      // 读取Experience Bundle模式摘要
      if (existsSync(bundlePath)) {
        const content = readFileSync(bundlePath, "utf-8");
        // 提取最小字段部分
        const fieldsMatch = content.match(/## Experience Bundle 最小字段\n([\s\S]*?)(?=\n##|$)/);
        if (fieldsMatch) {
          context += "### Bundle字段\n" + fieldsMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **Experience Bundle模式不存在**，建议先执行16包\n\n";
        statusText = "⚠ 经验未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-experience", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-experience", "⚠ 错误");
      console.error("Steel Will Experience Injector Error:", e.message);
    }
  });
  
  // 注册查看Experience Bundle模式命令
  pi.registerCommand("steel-will-bundle", {
    description: "查看钢铁意志Experience Bundle模式",
    handler: async (ctx: any) => {
      try {
        const bundlePath = join(protocolDir, "EXPERIENCE_BUNDLE_SCHEMA.md");
        
        if (existsSync(bundlePath)) {
          const content = readFileSync(bundlePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("Experience Bundle模式不存在，请先执行16包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`Experience Bundle模式查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看触发策略命令
  pi.registerCommand("steel-will-trigger", {
    description: "查看钢铁意志触发策略",
    handler: async (ctx: any) => {
      try {
        const triggerPath = join(protocolDir, "TRIGGER_POLICY.md");
        
        if (existsSync(triggerPath)) {
          const content = readFileSync(triggerPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("触发策略不存在，请先执行16包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`触发策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看注入策略命令
  pi.registerCommand("steel-will-injection", {
    description: "查看钢铁意志注入策略",
    handler: async (ctx: any) => {
      try {
        const injectionPath = join(protocolDir, "INJECTION_POLICY.md");
        
        if (existsSync(injectionPath)) {
          const content = readFileSync(injectionPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("注入策略不存在，请先执行16包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`注入策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看所有Bundle命令
  pi.registerCommand("steel-will-bundles", {
    description: "查看钢铁意志所有Bundle",
    handler: async (ctx: any) => {
      try {
        if (!existsSync(bundlesDir)) {
          ctx.ui.notify("Bundle目录不存在", "warning");
          return;
        }
        
        const { readdirSync } = require("fs");
        const files = readdirSync(bundlesDir).filter((f: string) => f.endsWith(".md"));
        
        if (files.length === 0) {
          ctx.ui.notify("暂无Bundle", "warning");
          return;
        }
        
        let output = "## 钢铁意志·PI版 所有Bundle\n\n";
        output += `**Bundle目录**: ${bundlesDir}\n\n`;
        output += `**Bundle文件**: ${files.length}个\n\n`;
        
        files.forEach((file: string) => {
          output += `- ${file}\n`;
        });
        
        ctx.ui.notify(output, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`Bundle查看失败: ${e.message}`, "error");
      }
    }
  });
}
