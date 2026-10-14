import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const adjudicationDir = join(memoryDir, "adjudication");
  
  // 会话开始时加载裁决配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(adjudicationDir)) {
        mkdirSync(adjudicationDir, { recursive: true });
      }
      
      const conflictPath = join(protocolDir, "CONFLICT_ADJUDICATION_RULES.md");
      const supersessionPath = join(protocolDir, "SUPERSESSION_POLICY.md");
      
      let context = "## 钢铁意志·PI版 裁决系统\n\n";
      let statusText = "✓ 裁决已加载";
      
      // 读取冲突裁决规则摘要
      if (existsSync(conflictPath)) {
        const content = readFileSync(conflictPath, "utf-8");
        // 提取冲突定义部分
        const conflictMatch = content.match(/## 冲突定义\n([\s\S]*?)(?=\n##|$)/);
        if (conflictMatch) {
          context += "### 冲突定义\n" + conflictMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **冲突裁决规则不存在**，建议先执行13包\n\n";
        statusText = "⚠ 裁决未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-adjudicator", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-adjudicator", "⚠ 错误");
      console.error("Steel Will Adjudicator Error:", e.message);
    }
  });
  
  // 注册查看冲突裁决规则命令
  pi.registerCommand("steel-will-conflict", {
    description: "查看钢铁意志冲突裁决规则",
    handler: async (ctx: any) => {
      try {
        const conflictPath = join(protocolDir, "CONFLICT_ADJUDICATION_RULES.md");
        
        if (existsSync(conflictPath)) {
          const content = readFileSync(conflictPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("冲突裁决规则不存在，请先执行13包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`冲突裁决规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看替代策略命令
  pi.registerCommand("steel-will-supersession", {
    description: "查看钢铁意志替代策略",
    handler: async (ctx: any) => {
      try {
        const supersessionPath = join(protocolDir, "SUPERSESSION_POLICY.md");
        
        if (existsSync(supersessionPath)) {
          const content = readFileSync(supersessionPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("替代策略不存在，请先执行13包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`替代策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看过时检测规则命令
  pi.registerCommand("steel-will-stale", {
    description: "查看钢铁意志过时检测规则",
    handler: async (ctx: any) => {
      try {
        const stalePath = join(protocolDir, "STALE_DETECTION_AND_DISPOSITION_RULES.md");
        
        if (existsSync(stalePath)) {
          const content = readFileSync(stalePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("过时检测规则不存在，请先执行13包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`过时检测规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看裁决账本命令
  pi.registerCommand("steel-will-ledger", {
    description: "查看钢铁意志裁决账本",
    handler: async (ctx: any) => {
      try {
        const ledgerPath = join(adjudicationDir, "sample-adjudication.md");
        
        if (existsSync(ledgerPath)) {
          const content = readFileSync(ledgerPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("裁决账本不存在", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`裁决账本查看失败: ${e.message}`, "error");
      }
    }
  });
}
