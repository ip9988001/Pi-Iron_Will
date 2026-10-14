import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const governanceDir = join(memoryDir, "governance");
  
  // 会话开始时加载迁移配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(governanceDir)) {
        mkdirSync(governanceDir, { recursive: true });
      }
      
      const bootstrapPath = join(protocolDir, "BOOTSTRAP_DEPLOYMENT_PROTOCOL.md");
      const acceptancePath = join(protocolDir, "REAL_WORKSPACE_ACCEPTANCE_RULES.md");
      
      let context = "## 钢铁意志·PI版 迁移系统\n\n";
      let statusText = "✓ 迁移已加载";
      
      // 读取Bootstrap部署协议摘要
      if (existsSync(bootstrapPath)) {
        const content = readFileSync(bootstrapPath, "utf-8");
        // 提取最小运行骨架清单部分
        const skeletonMatch = content.match(/## 最小运行骨架清单\n([\s\S]*?)(?=\n##|$)/);
        if (skeletonMatch) {
          context += "### 运行骨架\n" + skeletonMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **Bootstrap部署协议不存在**，建议先执行21包\n\n";
        statusText = "⚠ 迁移未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-migration", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-migration", "⚠ 错误");
      console.error("Steel Will Migration Error:", e.message);
    }
  });
  
  // 注册查看Bootstrap部署协议命令
  pi.registerCommand("steel-will-bootstrap", {
    description: "查看钢铁意志Bootstrap部署协议",
    handler: async (ctx: any) => {
      try {
        const bootstrapPath = join(protocolDir, "BOOTSTRAP_DEPLOYMENT_PROTOCOL.md");
        
        if (existsSync(bootstrapPath)) {
          const content = readFileSync(bootstrapPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("Bootstrap部署协议不存在，请先执行21包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`Bootstrap部署协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看真实工作区验收规则命令
  pi.registerCommand("steel-will-acceptance", {
    description: "查看钢铁意志真实工作区验收规则",
    handler: async (ctx: any) => {
      try {
        const acceptancePath = join(protocolDir, "REAL_WORKSPACE_ACCEPTANCE_RULES.md");
        
        if (existsSync(acceptancePath)) {
          const content = readFileSync(acceptancePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("真实工作区验收规则不存在，请先执行21包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`真实工作区验收规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看迁移烟雾测试规则命令
  pi.registerCommand("steel-will-smoke-test", {
    description: "查看钢铁意志迁移烟雾测试规则",
    handler: async (ctx: any) => {
      try {
        const smokeTestPath = join(protocolDir, "MIGRATION_SMOKE_TEST_RULES.md");
        
        if (existsSync(smokeTestPath)) {
          const content = readFileSync(smokeTestPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("迁移烟雾测试规则不存在，请先执行21包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`迁移烟雾测试规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看Bootstrap样本命令
  pi.registerCommand("steel-will-bootstrap-sample", {
    description: "查看钢铁意志Bootstrap样本",
    handler: async (ctx: any) => {
      try {
        const sampleDir = join(governanceDir, "real_workspace_bootstrap_001");
        
        if (existsSync(sampleDir)) {
          const { readdirSync } = require("fs");
          const files = readdirSync(sampleDir).filter((f: string) => f.endsWith(".md"));
          
          let output = "## 钢铁意志·PI版 Bootstrap样本\n\n";
          output += `**样本目录**: ${sampleDir}\n\n`;
          output += `**样本文件**: ${files.length}个\n\n`;
          
          files.forEach((file: string) => {
            output += `- ${file}\n`;
          });
          
          ctx.ui.notify(output, "info");
        } else {
          ctx.ui.notify("Bootstrap样本不存在", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`Bootstrap样本查看失败: ${e.message}`, "error");
      }
    }
  });
}
