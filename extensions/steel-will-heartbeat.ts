import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export default function (pi: any) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
  const memoryDir = join(homeDir, ".pi/agent/memory");
  // 协议文档解析：新布局在 memory/archive/protocols，老布局回退 memory 根
  const protocolDir = existsSync(join(memoryDir, "archive/protocols")) ? join(memoryDir, "archive/protocols") : memoryDir;
  
  // 会话开始时加载恢复协议
  pi.on("session_start", async (event: any, ctx: any) => {
    try {
      // 确保目录存在
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const resumePath = join(protocolDir, "RESUME_PROTOCOL.md");
      const snapshotPath = join(protocolDir, "CONTINUITY_SNAPSHOT.md");
      const resumeCardPath = join(protocolDir, "NEW_WINDOW_RESUME_CARD.md");
      
      let context = "## 钢铁意志·PI版 心跳续接\n\n";
      let statusText = "✓ 心跳已加载";
      
      // 读取连续性快照摘要
      if (existsSync(snapshotPath)) {
        const content = readFileSync(snapshotPath, "utf-8");
        // 提取当前阶段部分
        const stageMatch = content.match(/## 当前阶段\n(.+)/);
        if (stageMatch) {
          context += `**当前阶段**: ${stageMatch[1]}\n\n`;
        }
        
        // 提取当前一句话状态判断
        const statusMatch = content.match(/## 当前一句话状态判断\n(.+)/);
        if (statusMatch) {
          context += `**状态判断**: ${statusMatch[1]}\n\n`;
        }
      } else {
        context += "⚠ **连续性快照不存在**，建议先执行05包\n\n";
        statusText = "⚠ 快照未找到";
      }
      
      // 设置状态栏
      ctx.ui.setStatus("steel-will-heartbeat", statusText);
      
    } catch (e: any) {
      ctx.ui.setStatus("steel-will-heartbeat", "⚠ 错误");
      console.error("Steel Will Heartbeat Error:", e.message);
    }
  });
  
  // 注册查看恢复协议命令
  pi.registerCommand("steel-will-resume", {
    description: "查看钢铁意志恢复协议",
    handler: async (ctx: any) => {
      try {
        const resumePath = join(protocolDir, "RESUME_PROTOCOL.md");
        
        if (existsSync(resumePath)) {
          const content = readFileSync(resumePath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("恢复协议不存在，请先执行05包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`恢复协议查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看连续性快照命令
  pi.registerCommand("steel-will-snapshot", {
    description: "查看钢铁意志连续性快照",
    handler: async (ctx: any) => {
      try {
        const snapshotPath = join(protocolDir, "CONTINUITY_SNAPSHOT.md");
        
        if (existsSync(snapshotPath)) {
          const content = readFileSync(snapshotPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("连续性快照不存在，请先执行05包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`连续性快照查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册查看新窗口恢复卡命令
  pi.registerCommand("steel-will-resume-card", {
    description: "查看钢铁意志新窗口恢复卡",
    handler: async (ctx: any) => {
      try {
        const resumeCardPath = join(protocolDir, "NEW_WINDOW_RESUME_CARD.md");
        
        if (existsSync(resumeCardPath)) {
          const content = readFileSync(resumeCardPath, "utf-8");
          ctx.ui.notify(content, "info");
        } else {
          ctx.ui.notify("新窗口恢复卡不存在，请先执行05包", "warning");
        }
        
      } catch (e: any) {
        ctx.ui.notify(`新窗口恢复卡查看失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册快速续接命令
  pi.registerCommand("steel-will-quick-resume", {
    description: "钢铁意志快速续接",
    handler: async (ctx: any) => {
      try {
        let resume = "## 钢铁意志·PI版 快速续接\n\n";
        
        // 读取连续性快照
        const snapshotPath = join(protocolDir, "CONTINUITY_SNAPSHOT.md");
        if (existsSync(snapshotPath)) {
          const content = readFileSync(snapshotPath, "utf-8");
          
          // 提取关键信息
          const missionMatch = content.match(/## 当前 mission\n(.+)/);
          const stageMatch = content.match(/## 当前阶段\n(.+)/);
          const statusMatch = content.match(/## 当前一句话状态判断\n(.+)/);
          const nextMatch = content.match(/## 当前默认下一步\n(.+)/);
          
          if (missionMatch) resume += `**母目标**: ${missionMatch[1]}\n`;
          if (stageMatch) resume += `**当前阶段**: ${stageMatch[1]}\n`;
          if (statusMatch) resume += `**状态判断**: ${statusMatch[1]}\n`;
          if (nextMatch) resume += `**下一步**: ${nextMatch[1]}\n`;
        } else {
          resume += "⚠ 连续性快照不存在\n";
        }
        
        // 检查已完成的包
        const stagesDir = join(memoryDir, "stages");
        if (existsSync(stagesDir)) {
          const { readdirSync } = require("fs");
          const stages = readdirSync(stagesDir).filter((f: string) => f.endsWith("-result.md"));
          resume += `\n### 已完成的包 (${stages.length}个)\n`;
          stages.forEach((s: string) => {
            resume += `- ${s}\n`;
          });
        }
        
        ctx.ui.notify(resume, "info");
        
      } catch (e: any) {
        ctx.ui.notify(`快速续接失败: ${e.message}`, "error");
      }
    }
  });
  
  // 注册更新快照命令
  pi.registerCommand("steel-will-update-snapshot", {
    description: "更新钢铁意志连续性快照",
    handler: async (ctx: any) => {
      try {
        const snapshotPath = join(protocolDir, "CONTINUITY_SNAPSHOT.md");
        
        if (!existsSync(snapshotPath)) {
          ctx.ui.notify("连续性快照不存在，请先执行05包", "warning");
          return;
        }
        
        // 读取当前快照
        const snapshot = readFileSync(snapshotPath, "utf-8");
        
        // 读取当前阶段
        const currentStagePath = join(memoryDir, "goals/current-stage.md");
        if (existsSync(currentStagePath)) {
          const currentStage = readFileSync(currentStagePath, "utf-8");
          const stageMatch = currentStage.match(/## 当前阶段\n(.+)/);
          if (stageMatch) {
            // 更新快照中的当前阶段
            const updatedSnapshot = snapshot.replace(
              /## 当前阶段\n.*/,
              `## 当前阶段\n${stageMatch[1]}`
            );
            writeFileSync(snapshotPath, updatedSnapshot, "utf-8");
            ctx.ui.notify("✓ 连续性快照已更新", "info");
          }
        }
        
      } catch (e: any) {
        ctx.ui.notify(`快照更新失败: ${e.message}`, "error");
      }
    }
  });
}
