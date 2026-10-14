import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const swarmDir = join(memoryDir, "swarm_matrix");
  
  // 会话开始时加载蜂群配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(swarmDir)) {
        mkdirSync(swarmDir, { recursive: true });
      }
      
      const collaborationPath = join(protocolDir, "MULTI_AGENT_COLLABORATION_POLICY.md");
      const dispatchPath = join(protocolDir, "SWARM_DISPATCH_POLICY.md");
      
      let context = "## 钢铁意志·PI版 蜂群系统\n\n";
      let statusText = "✓ 蜂群已加载";
      
      // 读取多代理协作策略摘要
      if (existsSync(collaborationPath)) {
        const content = readFileSync(collaborationPath, "utf-8");
        // 提取什么时候值得裂变部分
        const splitMatch = content.match(/## 什么时候值得裂变\n([\s\S]*?)(?=\n##|$)/);
        if (splitMatch) {
          context += "### 裂变条件\n" + splitMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **多代理协作策略不存在**，建议先执行19包\n\n";
        statusText = "⚠ 蜂群未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-swarm", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-swarm", "⚠ 错误");
      console.error("Steel Will Swarm Error:", e.message);
    }
  });
  
  // 注册查看多代理协作策略命令
  pi.registerCommand("steel-will-collaboration", {
    description: "查看钢铁意志多代理协作策略",
    handler: async (ctx: any) => {
      try {
        const collaborationPath = join(protocolDir, "MULTI_AGENT_COLLABORATION_POLICY.md");
        
        if (existsSync(collaborationPath)) {
          const content = readFileSync(collaborationPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("多代理协作策略不存在，请先执行19包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`多代理协作策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看蜂群派发策略命令
  pi.registerCommand("steel-will-dispatch", {
    description: "查看钢铁意志蜂群派发策略",
    handler: async (ctx: any) => {
      try {
        const dispatchPath = join(protocolDir, "SWARM_DISPATCH_POLICY.md");
        
        if (existsSync(dispatchPath)) {
          const content = readFileSync(dispatchPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("蜂群派发策略不存在，请先执行19包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`蜂群派发策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看子代理mandate命令
  pi.registerCommand("steel-will-mandate", {
    description: "查看钢铁意志子代理mandate模式",
    handler: async (ctx: any) => {
      try {
        const mandatePath = join(protocolDir, "SUBAGENT_MANDATE_SCHEMA.md");
        
        if (existsSync(mandatePath)) {
          const content = readFileSync(mandatePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("子代理mandate模式不存在，请先执行19包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`子代理mandate模式查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看协作样本命令
  pi.registerCommand("steel-will-swarm-sample", {
    description: "查看钢铁意志协作样本",
    handler: async (ctx: any) => {
      try {
        const samplePath = join(swarmDir, "sample-collaboration.md");
        
        if (existsSync(samplePath)) {
          const content = readFileSync(samplePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("协作样本不存在", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`协作样本查看失败: ${e.message}`, "error");
      }
    }
  });
}
