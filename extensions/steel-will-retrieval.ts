import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话开始时加载检索配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const indexPath = join(protocolDir, "INDEX_NAVIGATION_PROTOCOL.md");
      const retrievalPath = join(protocolDir, "RETRIEVAL_LAYER_POLICY.md");
      
      let context = "## 钢铁意志·PI版 检索系统\n\n";
      let statusText = "✓ 检索已加载";
      
      // 读取INDEX导航协议摘要
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath, "utf-8");
        // 提取INDEX定位部分
        const indexMatch = content.match(/## INDEX 是导航主入口，不是搜索工具附庸\n([\s\S]*?)(?=\n##|$)/);
        if (indexMatch) {
          context += "### INDEX定位\n" + indexMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **INDEX导航协议不存在**，建议先执行14包\n\n";
        statusText = "⚠ 检索未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-retrieval", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-retrieval", "⚠ 错误");
      console.error("Steel Will Retrieval Error:", e.message);
    }
  });
  
  // 注册查看INDEX导航协议命令
  pi.registerCommand("steel-will-index", {
    description: "查看钢铁意志INDEX导航协议",
    handler: async (ctx: any) => {
      try {
        const indexPath = join(protocolDir, "INDEX_NAVIGATION_PROTOCOL.md");
        
        if (existsSync(indexPath)) {
          const content = readFileSync(indexPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("INDEX导航协议不存在，请先执行14包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`INDEX导航协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看检索层策略命令
  pi.registerCommand("steel-will-retrieval-layer", {
    description: "查看钢铁意志检索层策略",
    handler: async (ctx: any) => {
      try {
        const retrievalPath = join(protocolDir, "RETRIEVAL_LAYER_POLICY.md");
        
        if (existsSync(retrievalPath)) {
          const content = readFileSync(retrievalPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("检索层策略不存在，请先执行14包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`检索层策略查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看词法回退规则命令
  pi.registerCommand("steel-will-lexical", {
    description: "查看钢铁意志词法回退规则",
    handler: async (ctx: any) => {
      try {
        const lexicalPath = join(protocolDir, "LEXICAL_FALLBACK_RULES.md");
        
        if (existsSync(lexicalPath)) {
          const content = readFileSync(lexicalPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("词法回退规则不存在，请先执行14包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`词法回退规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看INDEX命令
  pi.registerCommand("steel-will-memory-index", {
    description: "查看钢铁意志INDEX",
    handler: async (ctx: any) => {
      try {
        const indexMdPath = join(protocolDir, "INDEX.md");
        
        if (existsSync(indexMdPath)) {
          const content = readFileSync(indexMdPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("INDEX不存在", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`INDEX查看失败: ${e.message}`, "error");
      }
    }
  });
}
