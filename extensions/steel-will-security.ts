import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  const preferencesDir = join(memoryDir, "user/preferences");
  
  // 会话开始时加载安全配置
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      if (!existsSync(preferencesDir)) {
        mkdirSync(preferencesDir, { recursive: true });
      }
      
      const boundaryPath = join(protocolDir, "BOUNDARY_READ_RULES.md");
      const approvalPath = join(preferencesDir, "APPROVAL_AND_BOUNDARIES.md");
      
      let context = "## 钢铁意志·PI版 安全配置\n\n";
      let statusText = "✓ 安全已加载";
      
      // 读取边界规则摘要
      if (existsSync(boundaryPath)) {
        const content = readFileSync(boundaryPath, "utf-8");
        // 提取高风险操作部分
        const highRiskMatch = content.match(/## 哪些动作执行前必须先读边界层\n([\s\S]*?)(?=\n##|$)/);
        if (highRiskMatch) {
          context += "### 高风险操作\n" + highRiskMatch[1] + "\n\n";
        }
      } else {
        context += "⚠ **边界规则不存在**，建议先执行06包\n\n";
        statusText = "⚠ 安全未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-security", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-security", "⚠ 错误");
      console.error("Steel Will Security Error:", e.message);
    }
  });
  
  // 工具调用前检查边界
  pi.on("tool_call", async (event: any, ctx: any) => {
    try {
      const toolName = event.tool;
      const params = event.params;
      
      // 检查是否为高风险操作
      const highRiskTools = ["bash", "write", "edit"];
      const isHighRisk = highRiskTools.includes(toolName);
      
      if (isHighRisk) {
        // 读取边界规则
        const boundaryPath = join(protocolDir, "BOUNDARY_READ_RULES.md");
        if (existsSync(boundaryPath)) {
          const content = readFileSync(boundaryPath, "utf-8");
          
          // 检查是否包含删除操作
          if (toolName === "bash" && params.command) {
            const command = params.command.toLowerCase();
            if (command.includes("rm") || command.includes("del") || command.includes("rmdir")) {
              ctx.ui.notify("⚠️ 检测到删除操作，请确认！", "warning");
            }
          }
          
          // 检查是否覆盖重要文件
          if (toolName === "write" && params.path) {
            const path = params.path.toLowerCase();
            if (path.includes("master-goal") || path.includes("start_here") || path.includes("stage_tracker")) {
              ctx.ui.notify("⚠️ 检测到覆盖重要文件，请确认！", "warning");
            }
          }
        }
      }
      
    } catch (e: any) {
      // 静默失败
      console.error("Steel Will Security Check Error:", e.message);
    }
  });
  
  // 注册查看边界规则命令
  pi.registerCommand("steel-will-boundary", {
    description: "查看钢铁意志边界规则",
    handler: async (ctx: any) => {
      try {
        const boundaryPath = join(protocolDir, "BOUNDARY_READ_RULES.md");
        
        if (existsSync(boundaryPath)) {
          const content = readFileSync(boundaryPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("边界规则不存在，请先执行06包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`边界规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看审批规则命令
  pi.registerCommand("steel-will-approval", {
    description: "查看钢铁意志审批规则",
    handler: async (ctx: any) => {
      try {
        const approvalPath = join(preferencesDir, "APPROVAL_AND_BOUNDARIES.md");
        
        if (existsSync(approvalPath)) {
          const content = readFileSync(approvalPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("审批规则不存在，请先执行06包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`审批规则查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看用户偏好命令
  pi.registerCommand("steel-will-preferences", {
    description: "查看钢铁意志用户偏好",
    handler: async (ctx: any) => {
      try {
        let preferences = "## 钢铁意志·PI版 用户偏好\n\n";
        
        // 检查各个偏好文件
        const files = [
          { path: "user/preferences/COMMUNICATION_PREFERENCES.md", name: "沟通偏好" },
          { path: "user/preferences/WORK_PREFERENCES.md", name: "工作偏好" },
          { path: "user/preferences/APPROVAL_AND_BOUNDARIES.md", name: "审批与边界" },
        ];
        
        for (const file of files) {
          const fullPath = join(memoryDir, file.path);
          if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, "utf-8");
            // 提取关键信息
            const lines = content.split("\n").slice(0, 10).join("\n");
            preferences += `### ${file.name}\n${lines}\n\n`;
          } else {
            preferences += `### ${file.name}\n⚠ 文件不存在\n\n`;
          }
        }
        
        ctx.ui.notify(preferences, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`用户偏好查看失败: ${e.message}`, "error");
      }
    }
  });
}
