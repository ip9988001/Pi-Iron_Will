import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// 引入语义检索服务（Fire-and-Forget 模式）
import semanticRetrievalService from "../services/steel-will-semantic-retrieval";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const agentDir = join(memoryDir, "agent");
  
  // L3目录列表（用于判断是否为L3文件）
  const L3_DIRECTORIES = [
    "decisions",
    "lessons", 
    "cases",
    "patterns",
    "projects",
    "anti-patterns",
    "actions",
    "reflections"
  ];
  
  /**
   * 判断文件路径是否为L3记忆文件
   */
  function isL3MemoryFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, "/");
    return L3_DIRECTORIES.some(dir => normalizedPath.includes(`/agent/${dir}/`));
  }
  
  /**
   * 从文件路径提取L3记忆类型
   */
  function extractL3MemoryType(filePath: string): string {
    const normalizedPath = filePath.replace(/\\/g, "/");
    for (const dir of L3_DIRECTORIES) {
      if (normalizedPath.includes(`/agent/${dir}/`)) {
        return dir;
      }
    }
    return "unknown";
  }
  
  // 会话开始时加载长期记忆配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(agentDir)) {
        mkdirSync(agentDir, { recursive: true });
      }
      
      const knowledgePath = join(protocolDir, "L3_KNOWLEDGE_POLICY.md");
      const routeMapPath = join(protocolDir, "L3_ROUTE_MAP.md");
      
      let context = "## 钢铁意志·PI版 长期记忆\n\n";
      let statusText = "✓ 长期已加载";
      
      // 读取L3知识策略摘要
      if (existsSync(knowledgePath)) {
        const content = readFileSync(knowledgePath, "utf-8");
        // 提取收录标准部分
        const standardMatch = content.match(/## L3 只收稳定、可复用、已验证或足够强证据支持的内容\n([\s\S]*?)(?=\n##|$)/);
        if (standardMatch) {
          context += "### 收录标准\n" + standardMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **L3知识策略不存在**，建议先执行10包\n\n";
        statusText = "⚠ 长期未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-long-term", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-long-term", "⚠ 错误");
      console.error("Steel Will Long Term Error:", e.message);
    }
  });
  
  // ============================================
  // [Hook] 工具调用拦截 - L3文件写入向量化
  // ============================================
  // 监听PI的工具调用事件，当检测到L3目录下的文件被写入时，触发向量化
  pi.on("tool_call", async (event: any, ctx: any) => {
    try {
      const toolName = event.tool;
      const params = event.params;
      
      // 检测write或edit工具调用
      if (toolName === "write" || toolName === "edit") {
        const filePath = params.path;
        
        // 判断是否为L3记忆文件
        if (filePath && isL3MemoryFile(filePath)) {
          console.log(`[SteelWill-LongTerm] 检测到L3文件写入: ${filePath}`);
          
          // Fire-and-Forget 模式：异步读取文件内容并向量化
          // 即便向量化失败，也仅打印日志，不阻断主流程
          try {
            // 异步读取文件内容
            const content = readFileSync(filePath, "utf-8");
            const memoryType = extractL3MemoryType(filePath);
            
            const vectorMetadata = {
              filePath: filePath,
              memoryType: 'l3' as const,
              createdAt: new Date().toISOString(),
              tags: ['l3-memory', memoryType],
            };
            
            // Fire-and-Forget：不等待完成，不阻塞主线程
            semanticRetrievalService.addMemory(content, vectorMetadata)
              .then(() => {
                console.log(`[SteelWill-LongTerm] ✅ L3记忆已向量化: ${memoryType}`);
              })
              .catch((err: Error) => {
                console.error(`[SteelWill-LongTerm] ⚠️ L3向量化失败（不影响主流程）:`, err.message);
              });
          } catch (readErr: any) {
            // 捕获同步异常，确保不影响主流程
            console.error(`[SteelWill-LongTerm] ⚠️ L3文件读取失败（不影响主流程）:`, readErr.message);
          }
        }
      }
    } catch (e: any) {
      // 静默失败，不影响主流程
      console.error("[SteelWill-LongTerm] Hook执行错误:", e.message);
    }
  });
  
  // 注册查看L3知识策略命令
  pi.registerCommand("steel-will-l3-policy", {
    description: "查看钢铁意志L3知识策略",
    handler: async (ctx: any) => {
      try {
        const knowledgePath = join(protocolDir, "L3_KNOWLEDGE_POLICY.md");
        
        if (existsSync(knowledgePath)) {
          const content = readFileSync(knowledgePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("L3知识策略不存在，请先执行10包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`L3知识策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看L3路由图命令
  pi.registerCommand("steel-will-l3-route", {
    description: "查看钢铁意志L3路由图",
    handler: async (ctx: any) => {
      try {
        const routeMapPath = join(protocolDir, "L3_ROUTE_MAP.md");
        
        if (existsSync(routeMapPath)) {
          const content = readFileSync(routeMapPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("L3路由图不存在，请先执行10包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`L3路由图查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看长期写回规则命令
  pi.registerCommand("steel-will-long-term-rules", {
    description: "查看钢铁意志长期写回规则",
    handler: async (ctx: any) => {
      try {
        const writebackPath = join(protocolDir, "LONG_TERM_WRITEBACK_RULES.md");
        
        if (existsSync(writebackPath)) {
          const content = readFileSync(writebackPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("长期写回规则不存在，请先执行10包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`长期写回规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看所有长期记忆命令
  pi.registerCommand("steel-will-long-term-memory", {
    description: "查看钢铁意志所有长期记忆",
    handler: async (ctx: any) => {
      try {
        const { readdirSync, statSync } = require("fs");
        
        function listLongTermMemory(dir: string, prefix: string = ""): string[] {
          if (!existsSync(dir)) return [];
          
          const items = readdirSync(dir);
          let result: string[] = [];
          
          for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory()) {
              result.push(`${prefix}📁 ${item}/`);
              result = result.concat(listLongTermMemory(fullPath, prefix + "  "));
            } else {
              result.push(`${prefix}📄 ${item}`);
            }
          }
          
          return result;
        }
        
        const longTermDirs = L3_DIRECTORIES;
        let output = "## 钢铁意志·PI版 长期记忆\n\n";
        
        for (const dir of longTermDirs) {
          const dirPath = join(agentDir, dir);
          if (existsSync(dirPath)) {
            const files = readdirSync(dirPath).filter((f: string) => f.endsWith(".md"));
            output += `### ${dir} (${files.length}个)\n`;
            files.forEach((file: string) => {
              output += `- ${file}\n`;
            });
            output += "\n";
          }
        }
        
        ctx.ui.notify(output, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`长期记忆查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册手动向量化L3记忆命令
  pi.registerCommand("steel-will-l3-vectorize", {
    description: "手动向量化L3记忆",
    handler: async (ctx: any) => {
      try {
        const { readdirSync, statSync } = require("fs");
        
        let vectorizedCount = 0;
        let failedCount = 0;
        
        for (const dir of L3_DIRECTORIES) {
          const dirPath = join(agentDir, dir);
          if (!existsSync(dirPath)) continue;
          
          const files = readdirSync(dirPath).filter((f: string) => f.endsWith(".md"));
          
          for (const file of files) {
            const filePath = join(dirPath, file);
            try {
              const content = readFileSync(filePath, "utf-8");
              
              const vectorMetadata = {
                filePath: filePath,
                memoryType: 'l3' as const,
                createdAt: new Date().toISOString(),
                tags: ['l3-memory', dir, 'manual-vectorize'],
              };
              
              await semanticRetrievalService.addMemory(content, vectorMetadata);
              vectorizedCount++;
            } catch (err: any) {
              console.error(`[SteelWill-LongTerm] 向量化失败: ${filePath}`, err.message);
              failedCount++;
            }
          }
        }
        
        ctx.ui.notify(`✅ L3记忆向量化完成\n\n**成功**: ${vectorizedCount}个\n**失败**: ${failedCount}个`, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`L3记忆向量化失败: ${e.message}`, "error");
      }
    }
  });
}