import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话开始时加载记忆骨架
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const domainPath = join(protocolDir, "MEMORY_DOMAIN_POLICY.md");
      const skeletonPath = join(protocolDir, "MEMORY_SKELETON.md");
      const directoryMapPath = join(protocolDir, "MEMORY_DIRECTORY_MAP.md");
      
      let context = "## 钢铁意志·PI版 记忆骨架\n\n";
      let statusText = "✓ 骨架已加载";
      
      // 读取记忆域策略摘要
      if (existsSync(domainPath)) {
        const content = readFileSync(domainPath, "utf-8");
        // 提取User Memory部分
        const userMatch = content.match(/## User Memory 负责什么\n([\s\S]*?)(?=\n##|$)/);
        if (userMatch) {
          context += "### 用户记忆\n" + userMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **记忆域策略不存在**，建议先执行08包\n\n";
        statusText = "⚠ 骨架未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-memory", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-memory", "⚠ 错误");
      console.error("Steel Will Memory Skeleton Error:", e.message);
    }
  });
  
  // 注册查看记忆域策略命令
  pi.registerCommand("steel-will-memory-domain", {
    description: "查看钢铁意志记忆域策略",
    handler: async (ctx: any) => {
      try {
        const domainPath = join(protocolDir, "MEMORY_DOMAIN_POLICY.md");
        
        if (existsSync(domainPath)) {
          const content = readFileSync(domainPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("记忆域策略不存在，请先执行08包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`记忆域策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看记忆骨架命令
  pi.registerCommand("steel-will-memory-skeleton", {
    description: "查看钢铁意志记忆骨架",
    handler: async (ctx: any) => {
      try {
        const skeletonPath = join(protocolDir, "MEMORY_SKELETON.md");
        
        if (existsSync(skeletonPath)) {
          const content = readFileSync(skeletonPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("记忆骨架不存在，请先执行08包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`记忆骨架查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看记忆目录映射命令
  pi.registerCommand("steel-will-memory-map", {
    description: "查看钢铁意志记忆目录映射",
    handler: async (ctx: any) => {
      try {
        const directoryMapPath = join(protocolDir, "MEMORY_DIRECTORY_MAP.md");
        
        if (existsSync(directoryMapPath)) {
          const content = readFileSync(directoryMapPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("记忆目录映射不存在，请先执行08包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`记忆目录映射查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看记忆结构命令
  pi.registerCommand("steel-will-memory-structure", {
    description: "查看钢铁意志记忆结构",
    handler: async (ctx: any) => {
      try {
        const { readdirSync, statSync } = require("fs");
        
        function listDir(dir: string, prefix: string = ""): string[] {
          if (!existsSync(dir)) return [];
          
          const items = readdirSync(dir);
          let result: string[] = [];
          
          for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory()) {
              result.push(`${prefix}📁 ${item}/`);
              result = result.concat(listDir(fullPath, prefix + "  "));
            } else {
              result.push(`${prefix}📄 ${item}`);
            }
          }
          
          return result;
        }
        
        const structure = listDir(memoryDir);
        let output = "## 钢铁意志·PI版 记忆结构\n\n";
        output += `**记忆目录**: ${memoryDir}\n\n`;
        output += structure.join("\n");
        
        ctx.ui.notify(output, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`记忆结构查看失败: ${e.message}`, "error");
      }
    }
  });
}
