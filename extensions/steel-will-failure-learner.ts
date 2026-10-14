import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const lessonsDir = join(memoryDir, "agent/lessons");
  
  // 会话开始时加载失败学习配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(lessonsDir)) {
        mkdirSync(lessonsDir, { recursive: true });
      }
      
      const failurePath = join(protocolDir, "FAILURE_LEARNING_PROTOCOL.md");
      const antiPatternPath = join(protocolDir, "ANTI_PATTERN_RULES.md");
      
      let context = "## 钢铁意志·PI版 失败学习\n\n";
      let statusText = "✓ 失败学习已加载";
      
      // 读取失败学习协议摘要
      if (existsSync(failurePath)) {
        const content = readFileSync(failurePath, "utf-8");
        // 提取失败经验必须转成的部分
        const failureMatch = content.match(/## 失败经验必须先转成 risk \/ anti-pattern \/ lesson \/ recommended_action\n([\s\S]*?)(?=\n##|$)/);
        if (failureMatch) {
          context += "### 失败经验结构\n" + failureMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **失败学习协议不存在**，建议先执行12包\n\n";
        statusText = "⚠ 失败学习未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-failure", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-failure", "⚠ 错误");
      console.error("Steel Will Failure Learner Error:", e.message);
    }
  });
  
  // 注册查看失败学习协议命令
  pi.registerCommand("steel-will-failure", {
    description: "查看钢铁意志失败学习协议",
    handler: async (ctx: any) => {
      try {
        const failurePath = join(protocolDir, "FAILURE_LEARNING_PROTOCOL.md");
        
        if (existsSync(failurePath)) {
          const content = readFileSync(failurePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("失败学习协议不存在，请先执行12包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`失败学习协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看反模式规则命令
  pi.registerCommand("steel-will-anti-pattern", {
    description: "查看钢铁意志反模式规则",
    handler: async (ctx: any) => {
      try {
        const antiPatternPath = join(protocolDir, "ANTI_PATTERN_RULES.md");
        
        if (existsSync(antiPatternPath)) {
          const content = readFileSync(antiPatternPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("反模式规则不存在，请先执行12包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`反模式规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看避坑指南命令
  pi.registerCommand("steel-will-pitfall", {
    description: "查看钢铁意志避坑指南",
    handler: async (ctx: any) => {
      try {
        const pitfallPath = join(protocolDir, "PITFALL_GUIDE_POLICY.md");
        
        if (existsSync(pitfallPath)) {
          const content = readFileSync(pitfallPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("避坑指南策略不存在，请先执行12包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`避坑指南查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看所有失败经验命令
  pi.registerCommand("steel-will-lessons", {
    description: "查看钢铁意志所有失败经验",
    handler: async (ctx: any) => {
      try {
        if (!existsSync(lessonsDir)) {
          ctx.ui.notify("失败经验目录不存在", "warning");
          return;
        }
        
        const { readdirSync } = require("fs");
        const files = readdirSync(lessonsDir).filter((f: string) => f.endsWith(".md"));
        
        if (files.length === 0) {
          ctx.ui.notify("暂无失败经验", "warning");
          return;
        }
        
        let output = "## 钢铁意志·PI版 所有失败经验\n\n";
        output += `**失败经验目录**: ${lessonsDir}\n\n`;
        output += `**失败经验文件**: ${files.length}个\n\n`;
        
        files.forEach((file: string) => {
          output += `- ${file}\n`;
        });
        
        ctx.ui.notify(output, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`失败经验查看失败: ${e.message}`, "error");
      }
    }
  });
}
