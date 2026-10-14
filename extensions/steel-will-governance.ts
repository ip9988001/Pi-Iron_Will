import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const governanceDir = join(memoryDir, "governance");
  
  // 会话开始时加载治理配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(governanceDir)) {
        mkdirSync(governanceDir, { recursive: true });
      }
      
      const riskPath = join(protocolDir, "RISK_GOVERNANCE_POLICY.md");
      const preflightPath = join(protocolDir, "PREFLIGHT_DECISION_RULES.md");
      
      let context = "## 钢铁意志·PI版 治理系统\n\n";
      let statusText = "✓ 治理已加载";
      
      // 读取风险治理策略摘要
      if (existsSync(riskPath)) {
        const content = readFileSync(riskPath, "utf-8");
        // 提取什么任务必须进入治理工作台部分
        const riskMatch = content.match(/## 什么任务必须进入治理工作台\n([\s\S]*?)(?=\n##|$)/);
        if (riskMatch) {
          context += "### 治理任务\n" + riskMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **风险治理策略不存在**，建议先执行18包\n\n";
        statusText = "⚠ 治理未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-governance", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-governance", "⚠ 错误");
      console.error("Steel Will Governance Error:", e.message);
    }
  });
  
  // 注册查看风险治理策略命令
  pi.registerCommand("steel-will-risk", {
    description: "查看钢铁意志风险治理策略",
    handler: async (ctx: any) => {
      try {
        const riskPath = join(protocolDir, "RISK_GOVERNANCE_POLICY.md");
        
        if (existsSync(riskPath)) {
          const content = readFileSync(riskPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("风险治理策略不存在，请先执行18包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`风险治理策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看预检决策规则命令
  pi.registerCommand("steel-will-preflight", {
    description: "查看钢铁意志预检决策规则",
    handler: async (ctx: any) => {
      try {
        const preflightPath = join(protocolDir, "PREFLIGHT_DECISION_RULES.md");
        
        if (existsSync(preflightPath)) {
          const content = readFileSync(preflightPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("预检决策规则不存在，请先执行18包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`预检决策规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看保护模式策略命令
  pi.registerCommand("steel-will-protection", {
    description: "查看钢铁意志保护模式策略",
    handler: async (ctx: any) => {
      try {
        const protectionPath = join(protocolDir, "PROTECTION_MODE_POLICY.md");
        
        if (existsSync(protectionPath)) {
          const content = readFileSync(protectionPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("保护模式策略不存在，请先执行18包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`保护模式策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看审计账本命令
  pi.registerCommand("steel-will-audit", {
    description: "查看钢铁意志审计账本",
    handler: async (ctx: any) => {
      try {
        const auditPath = join(governanceDir, "sample-governance.md");
        
        if (existsSync(auditPath)) {
          const content = readFileSync(auditPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("审计账本不存在", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`审计账本查看失败: ${e.message}`, "error");
      }
    }
  });
}
