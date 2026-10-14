import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话开始时加载本体论配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const termPath = join(protocolDir, "TERM_CANONICALIZATION_RULES.md");
      const schemaPath = join(protocolDir, "KEY_FILE_SCHEMA_RULES.md");
      
      let context = "## 钢铁意志·PI版 本体论\n\n";
      let statusText = "✓ 本体论已加载";
      
      // 读取术语规范化规则摘要
      if (existsSync(termPath)) {
        const content = readFileSync(termPath, "utf-8");
        // 提取正式主叫法部分
        const termMatch = content.match(/## 哪些术语是正式主叫法\n([\s\S]*?)(?=\n##|$)/);
        if (termMatch) {
          context += "### 正式术语\n" + termMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **术语规范化规则不存在**，建议先执行22包\n\n";
        statusText = "⚠ 本体论未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-ontology", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-ontology", "⚠ 错误");
      console.error("Steel Will Ontology Error:", e.message);
    }
  });
  
  // 注册查看术语规范化规则命令
  pi.registerCommand("steel-will-terms", {
    description: "查看钢铁意志术语规范化规则",
    handler: async (ctx: any) => {
      try {
        const termPath = join(protocolDir, "TERM_CANONICALIZATION_RULES.md");
        
        if (existsSync(termPath)) {
          const content = readFileSync(termPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("术语规范化规则不存在，请先执行22包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`术语规范化规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看关键文件Schema规则命令
  pi.registerCommand("steel-will-schema", {
    description: "查看钢铁意志关键文件Schema规则",
    handler: async (ctx: any) => {
      try {
        const schemaPath = join(protocolDir, "KEY_FILE_SCHEMA_RULES.md");
        
        if (existsSync(schemaPath)) {
          const content = readFileSync(schemaPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("关键文件Schema规则不存在，请先执行22包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`关键文件Schema规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看锚点引用协议命令
  pi.registerCommand("steel-will-anchor", {
    description: "查看钢铁意志锚点引用协议",
    handler: async (ctx: any) => {
      try {
        const anchorPath = join(protocolDir, "ANCHOR_REFERENCE_PROTOCOL.md");
        
        if (existsSync(anchorPath)) {
          const content = readFileSync(anchorPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("锚点引用协议不存在，请先执行22包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`锚点引用协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看品牌应答协议命令
  pi.registerCommand("steel-will-brand", {
    description: "查看钢铁意志品牌应答协议",
    handler: async (ctx: any) => {
      try {
        const brandPath = join(protocolDir, "STEEL_WILL_BRAND_RESPONSE_PROTOCOL.md");
        
        if (existsSync(brandPath)) {
          const content = readFileSync(brandPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("品牌应答协议不存在，请先执行22包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`品牌应答协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看子系统规范映射命令
  pi.registerCommand("steel-will-subsystem", {
    description: "查看钢铁意志子系统规范映射",
    handler: async (ctx: any) => {
      try {
        const subsystemPath = join(protocolDir, "STEEL_WILL_SUBSYSTEM_CANONICAL_MAP.md");
        
        if (existsSync(subsystemPath)) {
          const content = readFileSync(subsystemPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("子系统规范映射不存在，请先执行22包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`子系统规范映射查看失败: ${e.message}`, "error");
      }
    }
  });
}
