import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const candidatesDir = join(memoryDir, "candidates");
  
  // 会话开始时加载候选筛选配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(candidatesDir)) {
        mkdirSync(candidatesDir, { recursive: true });
      }
      
      const heartbeatPath = join(protocolDir, "HEARTBEAT_SCREENING_PROTOCOL.md");
      const candidatePoolPath = join(protocolDir, "L2_CANDIDATE_POOL_RULES.md");
      
      let context = "## 钢铁意志·PI版 候选筛选\n\n";
      let statusText = "✓ 候选已加载";
      
      // 读取Heartbeat筛选协议摘要
      if (existsSync(heartbeatPath)) {
        const content = readFileSync(heartbeatPath, "utf-8");
        // 提取Heartbeat定位部分
        const heartbeatMatch = content.match(/## Heartbeat 的定位是日间整合器，不是深反思器\n([\s\S]*?)(?=\n##|$)/);
        if (heartbeatMatch) {
          context += "### Heartbeat定位\n" + heartbeatMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **Heartbeat筛选协议不存在**，建议先执行09包\n\n";
        statusText = "⚠ 候选未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-candidate", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-candidate", "⚠ 错误");
      console.error("Steel Will Candidate Screener Error:", e.message);
    }
  });
  
  // 注册查看Heartbeat筛选协议命令
  pi.registerCommand("steel-will-heartbeat", {
    description: "查看钢铁意志Heartbeat筛选协议",
    handler: async (ctx: any) => {
      try {
        const heartbeatPath = join(protocolDir, "HEARTBEAT_SCREENING_PROTOCOL.md");
        
        if (existsSync(heartbeatPath)) {
          const content = readFileSync(heartbeatPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("Heartbeat筛选协议不存在，请先执行09包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`Heartbeat筛选协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看L2候选池规则命令
  pi.registerCommand("steel-will-candidate-pool", {
    description: "查看钢铁意志L2候选池规则",
    handler: async (ctx: any) => {
      try {
        const candidatePoolPath = join(protocolDir, "L2_CANDIDATE_POOL_RULES.md");
        
        if (existsSync(candidatePoolPath)) {
          const content = readFileSync(candidatePoolPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("L2候选池规则不存在，请先执行09包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`L2候选池规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看候选状态规则命令
  pi.registerCommand("steel-will-candidate-status", {
    description: "查看钢铁意志候选状态规则",
    handler: async (ctx: any) => {
      try {
        const candidateStatusPath = join(protocolDir, "CANDIDATE_STATUS_RULES.md");
        
        if (existsSync(candidateStatusPath)) {
          const content = readFileSync(candidateStatusPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("候选状态规则不存在，请先执行09包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`候选状态规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看所有候选命令
  pi.registerCommand("steel-will-candidates", {
    description: "查看钢铁意志所有候选",
    handler: async (ctx: any) => {
      try {
        if (!existsSync(candidatesDir)) {
          ctx.ui.notify("候选目录不存在", "warning");
          return;
        }
        
        const { readdirSync, statSync } = require("fs");
        
        function listCandidates(dir: string, domain: string): string[] {
          if (!existsSync(dir)) return [];
          
          const files = readdirSync(dir).filter((f: string) => f.endsWith(".md"));
          let result: string[] = [];
          
          files.forEach((file: string) => {
            const fullPath = join(dir, file);
            const content = readFileSync(fullPath, "utf-8");
            
            // 宽松匹配：L2 候选实际写法是「- **状态**: candidate」，原先只认全角「- 状态：」导致统计恒为「未知」
            const statusMatch = content.match(/状态\**\s*[:：]\s*([^\n*]+)/);
            const status = statusMatch ? statusMatch[1] : "未知";
            
            result.push(`- [${domain}] ${file} - ${status}`);
          });
          
          return result;
        }
        
        let candidates = "## 钢铁意志·PI版 所有候选\n\n";
        
        const userCandidates = listCandidates(join(candidatesDir, "user"), "user");
        const agentCandidates = listCandidates(join(candidatesDir, "agent"), "agent");
        
        if (userCandidates.length === 0 && agentCandidates.length === 0) {
          candidates += "暂无候选条目\n";
        } else {
          if (userCandidates.length > 0) {
            candidates += "### 用户域候选\n";
            candidates += userCandidates.join("\n") + "\n\n";
          }
          
          if (agentCandidates.length > 0) {
            candidates += "### Agent域候选\n";
            candidates += agentCandidates.join("\n") + "\n";
          }
        }
        
        ctx.ui.notify(candidates, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`候选查看失败: ${e.message}`, "error");
      }
    }
  });
}
