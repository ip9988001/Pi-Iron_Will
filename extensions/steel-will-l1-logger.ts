import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { join } from "path";

// 引入语义检索服务（Fire-and-Forget 模式）
import semanticRetrievalService from "../services/steel-will-semantic-retrieval";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const l1Dir = join(memoryDir, "l1");
  
  // 会话开始时加载L1配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(l1Dir)) {
        mkdirSync(l1Dir, { recursive: true });
      }
      
      const protocolPath = join(protocolDir, "L1_WRITE_PROTOCOL.md");
      const dailyLogPath = join(protocolDir, "DAILY_LOG_RULES.md");
      
      let context = "## 钢铁意志·PI版 L1记忆\n\n";
      let statusText = "✓ L1已加载";
      
      // 读取L1写入协议摘要
      if (existsSync(protocolPath)) {
        const content = readFileSync(protocolPath, "utf-8");
        // 提取必须先进入L1的部分
        const l1Match = content.match(/## 哪些内容必须先进入 L1\n([\s\S]*?)(?=\n##|$)/);
        if (l1Match) {
          context += "### L1写入规则\n" + l1Match[1] + "\n\n";
        }
      } else {
        context += "⚠ **L1写入协议不存在**，建议先执行07包\n\n";
        statusText = "⚠ L1未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-l1", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-l1", "⚠ 错误");
      console.error("Steel Will L1 Logger Error:", e.message);
    }
  });
  
  // 会话结束时记录日志
  pi.on("session_end", async (event: any, ctx: any) => {
    try {
      // 获取当前日期
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];
      
      // 检查每日日志文件
      const dailyLogPath = join(l1Dir, `${dateStr}.md`);
      
      if (!existsSync(dailyLogPath)) {
        // 创建新的每日日志
        const header = `# ${dateStr} 日志\n\n`;
        writeFileSync(dailyLogPath, header, "utf-8");
      }
      
      // 追加会话结束记录
      const logEntry = `\n## [${timeStr}] 会话结束\n\n**状态**：会话正常结束\n\n`;
      appendFileSync(dailyLogPath, logEntry, "utf-8");
      
      // ============================================
      // [Hook] 向量化记忆 - Fire-and-Forget 模式
      // ============================================
      // 文件成功写入硬盘后，异步触发向量化
      // 即便向量化失败，也仅打印日志，不阻断主流程
      try {
        const vectorMetadata = {
          filePath: dailyLogPath,
          memoryType: 'l1' as const,
          createdAt: new Date().toISOString(),
          tags: ['session-end', 'daily-log'],
        };
        
        // Fire-and-Forget：不等待完成，不阻塞主线程
        semanticRetrievalService.addMemory(logEntry, vectorMetadata)
          .then(() => {
            console.log('[SteelWill-L1] ✅ 会话结束日志已向量化');
          })
          .catch((err: Error) => {
            console.error('[SteelWill-L1] ⚠️ 向量化失败（不影响主流程）:', err.message);
          });
      } catch (vectorErr: any) {
        // 捕获同步异常，确保不影响主流程
        console.error('[SteelWill-L1] ⚠️ 向量化初始化失败（不影响主流程）:', vectorErr.message);
      }
      
    } catch (e: any) {
      // 静默失败
      console.error("Steel Will L1 Logger Session End Error:", e.message);
    }
  });
  
  // 注册查看L1协议命令
  pi.registerCommand("steel-will-l1-protocol", {
    description: "查看钢铁意志L1写入协议",
    handler: async (ctx: any) => {
      try {
        const protocolPath = join(protocolDir, "L1_WRITE_PROTOCOL.md");
        
        if (existsSync(protocolPath)) {
          const content = readFileSync(protocolPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("L1写入协议不存在，请先执行07包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`L1协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看每日日志命令
  pi.registerCommand("steel-will-daily-log", {
    description: "查看钢铁意志每日日志",
    handler: async (ctx: any) => {
      try {
        // 获取当前日期
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        
        const dailyLogPath = join(l1Dir, `${dateStr}.md`);
        
        if (existsSync(dailyLogPath)) {
          const content = readFileSync(dailyLogPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify(`今日日志不存在：${dateStr}`, "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`每日日志查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看所有日志命令
  pi.registerCommand("steel-will-all-logs", {
    description: "查看钢铁意志所有日志",
    handler: async (ctx: any) => {
      try {
        if (!existsSync(l1Dir)) {
          ctx.ui.notify("L1目录不存在", "warning");
          return;
        }
        
        const { readdirSync } = require("fs");
        const files = readdirSync(l1Dir).filter((f: string) => f.endsWith(".md"));
        
        if (files.length === 0) {
          ctx.ui.notify("暂无日志文件", "warning");
          return;
        }
        
        let logs = "## 钢铁意志·PI版 所有日志\n\n";
        logs += `**日志目录**: ${l1Dir}\n\n`;
        logs += `**日志文件**: ${files.length}个\n\n`;
        
        files.forEach((file: string) => {
          logs += `- ${file}\n`;
        });
        
        ctx.ui.notify(logs, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`日志查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册记录日志命令
  pi.registerCommand("steel-will-log", {
    description: "记录钢铁意志日志",
    handler: async (ctx: any) => {
      try {
        // 获取当前日期和时间
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().split(" ")[0];
        
        // 检查每日日志文件
        const dailyLogPath = join(l1Dir, `${dateStr}.md`);
        
        if (!existsSync(dailyLogPath)) {
          // 创建新的每日日志
          const header = `# ${dateStr} 日志\n\n`;
          writeFileSync(dailyLogPath, header, "utf-8");
        }
        
        // 追加用户记录
        const logEntry = `\n## [${timeStr}] 用户记录\n\n**时间**：${dateStr} ${timeStr}\n\n**状态**：用户主动记录\n\n`;
        appendFileSync(dailyLogPath, logEntry, "utf-8");
        
        // ============================================
        // [Hook] 向量化记忆 - Fire-and-Forget 模式
        // ============================================
        // 文件成功写入硬盘后，异步触发向量化
        // 即便向量化失败，也仅打印日志，不阻断主流程
        try {
          const vectorMetadata = {
            filePath: dailyLogPath,
            memoryType: 'l1' as const,
            createdAt: new Date().toISOString(),
            tags: ['user-log', 'manual-entry'],
          };
          
          // Fire-and-Forget：不等待完成，不阻塞主线程
          semanticRetrievalService.addMemory(logEntry, vectorMetadata)
            .then(() => {
              console.log('[SteelWill-L1] ✅ 用户日志已向量化');
            })
            .catch((err: Error) => {
              console.error('[SteelWill-L1] ⚠️ 向量化失败（不影响主流程）:', err.message);
            });
        } catch (vectorErr: any) {
          // 捕获同步异常，确保不影响主流程
          console.error('[SteelWill-L1] ⚠️ 向量化初始化失败（不影响主流程）:', vectorErr.message);
        }
        
        ctx.ui.notify(`✓ 日志已记录：${dateStr} ${timeStr}`, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`日志记录失败: ${e.message}`, "error");
      }
    }
  });
}