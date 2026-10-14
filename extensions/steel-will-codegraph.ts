/**
 * 钢铁意志·PI版 — CodeGraph 代码图谱查询引擎
 * 
 * 基于 pi 内置的 .codegraph/codegraph.db SQLite 数据库，
 * 提供代码符号搜索、依赖分析、调用链追踪等能力。
 * 
 * 数据库概览：
 *   nodes (711) — 符号节点（class/function/import/variable/file...）
 *   edges (1271) — 关系边（contains/imports/calls/references...）
 *   files (50)   — 索引文件
 *   unresolved_refs — 未解析引用
 *   nodes_fts — 全文搜索索引
 * 
 * 查询类型：
 *   search    — 全文搜索符号名
 *   symbol    — 符号详情
 *   imports   — 文件的导入列表
 *   exports   — 文件的导出列表
 *   references — 谁引用了这个符号
 *   callers    — 谁调用了这个函数
 *   file       — 文件中所有符号
 *   deps       — 文件依赖图
 *   status     — 数据库概览
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || "~";
const CODEGRAPH_DB = join(HOME_DIR, ".pi", ".codegraph", "codegraph.db");
const MEMORY_DIR = join(HOME_DIR, ".pi", "agent", "memory");
const LOG_PREFIX = "[SteelWill-CodeGraph]";

// Python 查询脚本（内联，避免额外文件依赖）
function buildPythonScript(queryType: string, params: Record<string, any>): string {
  const dbPath = CODEGRAPH_DB.replace(/\\/g, "/");
  let sql = "";

  switch (queryType) {
    case "search": {
      const kw = (params.keyword as string).replace(/'/g, "''");
      sql = `SELECT n.id, n.kind, n.name, n.qualified_name, n.file_path, n.start_line, n.signature, n.docstring
FROM nodes_fts f JOIN nodes n ON n.id = f.rowid
WHERE nodes_fts MATCH '${kw}' ORDER BY rank LIMIT ${params.top_k ?? 10}`;
      break;
    }
    case "symbol": {
      const name = (params.name as string).replace(/'/g, "''");
      sql = `SELECT * FROM nodes WHERE name = '${name}' OR qualified_name = '${name}' LIMIT 1`;
      break;
    }
    case "imports": {
      const fp = (params.file_path as string).replace(/'/g, "''");
      sql = `SELECT n.name, n.signature, n.file_path
FROM nodes n
JOIN edges e ON e.target = n.id
WHERE e.kind = 'imports' AND n.kind = 'import'
  AND e.source = (SELECT id FROM nodes WHERE file_path = '${fp}' AND kind = 'file')
ORDER BY n.start_line`;
      break;
    }
    case "exports": {
      const fp = (params.file_path as string).replace(/'/g, "''");
      sql = `SELECT n.name, n.kind, n.signature, n.start_line, n.visibility
FROM nodes n
JOIN edges e ON e.target = n.id
WHERE e.kind = 'contains' AND n.kind != 'import' AND n.kind != 'file' AND n.is_exported = 1
  AND e.source = (SELECT id FROM nodes WHERE file_path = '${fp}' AND kind = 'file')
ORDER BY n.start_line`;
      break;
    }
    case "references": {
      const name = (params.name as string).replace(/'/g, "''");
      sql = `SELECT DISTINCT sn.file_path, sn.name AS caller_name, sn.kind, e.kind AS edge_kind, sn.start_line
FROM nodes tn
JOIN edges e ON e.target = tn.id
JOIN nodes sn ON sn.id = e.source
WHERE tn.name = '${name}' AND e.kind IN ('calls','references','imports')
ORDER BY sn.file_path, sn.start_line
LIMIT ${params.top_k ?? 20}`;
      break;
    }
    case "callers": {
      const name = (params.name as string).replace(/'/g, "''");
      sql = `SELECT DISTINCT sn.file_path, sn.name AS caller_name, sn.signature, sn.start_line
FROM nodes tn
JOIN edges e ON e.target = tn.id
JOIN nodes sn ON sn.id = e.source
WHERE tn.name = '${name}' AND e.kind = 'calls'
ORDER BY sn.file_path, sn.start_line
LIMIT ${params.top_k ?? 20}`;
      break;
    }
    case "file": {
      const fp = (params.file_path as string).replace(/'/g, "''");
      sql = `SELECT n.name, n.kind, n.signature, n.start_line, n.is_exported, n.visibility
FROM nodes n
JOIN edges e ON e.target = n.id
WHERE e.kind = 'contains' AND n.kind != 'file'
  AND e.source = (SELECT id FROM nodes WHERE file_path = '${fp}' AND kind = 'file')
ORDER BY n.kind, n.start_line`;
      break;
    }
    case "deps": {
      const fp = (params.file_path as string).replace(/'/g, "''");
      sql = `SELECT DISTINCT n2.file_path AS depends_on, n1.file_path AS imported_from
FROM nodes n1
JOIN edges e1 ON e1.target = n1.id
JOIN edges e2 ON e2.source = n1.id
JOIN nodes n2 ON n2.id = e2.target
WHERE n1.kind = 'import'
  AND e1.kind = 'imports'
  AND e2.kind = 'imports'
  AND e1.source = (SELECT id FROM nodes WHERE file_path = '${fp}' AND kind = 'file')
  AND n2.file_path IS NOT NULL
ORDER BY n2.file_path`;
      break;
    }
    case "status": {
      sql = `SELECT 'nodes' as tbl, COUNT(*) as cnt FROM nodes
UNION ALL SELECT 'edges', COUNT(*) FROM edges
UNION ALL SELECT 'files', COUNT(*) FROM files
UNION ALL SELECT 'unresolved', COUNT(*) FROM unresolved_refs`;
      break;
    }
    default:
      return "";
  }

  return `
import sqlite3, json, sys

// 跨平台解释器：Windows 上是 python，类 Unix 上是 python3
const PY_CMD = process.platform === "win32" ? "python" : "python3";
try:
    db = sqlite3.connect(r"${dbPath}")
    db.row_factory = sqlite3.Row
    rows = db.execute("""${sql}""").fetchall()
    result = []
    for r in rows:
        d = {k: r[k] for k in r.keys()}
        result.append(d)
    print(json.dumps(result, ensure_ascii=False, default=str))
    db.close()
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(0)
`;
}

function queryCodeGraph(queryType: string, params: Record<string, any>): any[] {
  if (!existsSync(CODEGRAPH_DB)) {
    throw new Error(`CodeGraph 数据库不存在: ${CODEGRAPH_DB}`);
  }

  const script = buildPythonScript(queryType, params);
  if (!script) {
    throw new Error(`未知查询类型: ${queryType}`);
  }

  // 写入临时文件再执行，避免 Windows shell 转义问题
  const tmpFile = join(MEMORY_DIR, "system", ".codegraph_tmp.py");
  const parentDir = join(MEMORY_DIR, "system");
  if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
  writeFileSync(tmpFile, script, "utf-8");

  const result = execSync(`${PY_CMD} "${tmpFile}"`, {
    encoding: "utf-8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });

  return JSON.parse(result.trim() || "[]");
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    try {
      const dbExists = existsSync(CODEGRAPH_DB);
      console.log(`${LOG_PREFIX} 代码图谱已加载 (db=${dbExists})`);
      ctx.ui.setStatus("steel-will-codegraph", dbExists ? "✓ codegraph ready" : "⚠ db missing");
    } catch (e: any) {
      console.error(`${LOG_PREFIX} 初始化错误:`, e.message);
    }
  });

  pi.registerTool({
    name: "codegraph",
    label: "Query CodeGraph",
    description:
      "查询 pi 内置的代码图谱数据库 (codegraph.db)，支持符号搜索、依赖分析、调用链追踪。",
    promptSnippet: "Query the codegraph database for symbol search, dependency analysis, call tracing",
    promptGuidelines: [
      "Use codegraph when you need to understand code relationships, dependencies, or call chains.",
      "Use search mode to find symbols by name (FTS).",
      "Use references/callers mode to trace who uses a function.",
      "Use imports/exports mode to analyze file dependencies.",
      "Use deps mode to see a file's dependency graph.",
    ],
    parameters: Type.Object({
      query_type: Type.String({
        description:
          "Query type: search (FTS by name), symbol (details), imports (file imports), exports (file exports), references (who references symbol), callers (who calls function), file (symbols in file), deps (file dependencies), status (DB overview)",
      }),
      keyword: Type.Optional(Type.String({ description: "Search keyword (for search mode)" })),
      name: Type.Optional(Type.String({ description: "Symbol name (for symbol/references/callers)" })),
      file_path: Type.Optional(Type.String({ description: "File path (for imports/exports/file/deps)" })),
      top_k: Type.Optional(Type.Number({ description: "Max results", default: 10 })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate) {
      const queryType = params.query_type as string;
      console.log(`${LOG_PREFIX} query type=${queryType}`);

      try {
        const results = queryCodeGraph(queryType, params as Record<string, any>);

        if (!Array.isArray(results) || results.length === 0) {
          return {
            content: [{
              type: "text",
              text: `CodeGraph query: ${queryType}\n\nNo results found.`,
            }],
            details: { queryType, resultCount: 0 },
          };
        }

        // 格式化输出
        let text = `## CodeGraph: ${queryType}\n\n`;
        const count = results.length;

        if (queryType === "status") {
          for (const r of results) {
            text += `- **${r.tbl}**: ${r.cnt}\n`;
          }
        } else if (queryType === "search") {
          text += `Results: ${count}\n\n`;
          for (const r of results) {
            text += `### ${r.kind}: \`${r.name}\`\n`;
            text += `- File: \`${r.file_path}\` line ${r.start_line}\n`;
            if (r.signature) text += `- Signature: \`${r.signature}\`\n`;
            if (r.docstring) text += `- Doc: ${r.docstring}\n`;
            text += "\n";
          }
        } else if (queryType === "symbol") {
          const r = results[0];
          text += `### ${r.kind}: \`${r.name}\`\n`;
          text += `- Full: \`${r.qualified_name}\`\n`;
          text += `- File: \`${r.file_path}\` L${r.start_line}-L${r.end_line}\n`;
          if (r.signature) text += `- Signature: \`${r.signature}\`\n`;
          if (r.visibility) text += `- Visibility: ${r.visibility}\n`;
          text += `- Exported: ${r.is_exported ? "yes" : "no"}\n`;
          if (r.docstring) text += `- Doc: ${r.docstring}\n`;
        } else if (queryType === "imports" || queryType === "exports") {
          text += `Results: ${count}\n\n`;
          for (const r of results) {
            const label = queryType === "imports" ? `import \`${r.signature}\`` : `${r.kind} \`${r.name}\` (L${r.start_line})`;
            text += `- ${label}\n`;
          }
        } else if (queryType === "references" || queryType === "callers") {
          text += `Results: ${count}\n\n`;
          for (const r of results) {
            text += `- \`${r.caller_name}\` in \`${r.file_path}\` L${r.start_line} (${r.edge_kind ?? "calls"})\n`;
          }
        } else if (queryType === "file") {
          text += `Symbols: ${count}\n\n`;
          let currentKind = "";
          for (const r of results) {
            if (r.kind !== currentKind) {
              currentKind = r.kind;
              text += `\n### ${currentKind}s\n`;
            }
            const exp = r.is_exported ? "⬆" : " ";
            const vis = r.visibility ?? "";
            text += `- L${r.start_line} ${exp} \`${r.name}\`${vis ? ` (${vis})` : ""}\n`;
          }
        } else if (queryType === "deps") {
          text += `Dependencies: ${count}\n\n`;
          for (const r of results) {
            text += `- \`${r.depends_on}\`\n`;
          }
        }

        text += `\n---\n*Tip: use \`codegraph\` with file/symbol/references for deeper exploration.*`;

        return {
          content: [{ type: "text", text }],
          details: { queryType, resultCount: count, results },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `❌ CodeGraph 查询失败: ${error.message}` }],
          isError: true,
        };
      }
    },
  });

  // 命令
  pi.registerCommand("codegraph-status", {
    description: "查看 CodeGraph 数据库状态",
    handler: async (_args, ctx) => {
      try {
        const results = queryCodeGraph("status", {});
        let text = `## CodeGraph Status\n\n`;
        for (const r of results) {
          text += `- ${r.tbl}: ${r.cnt}\n`;
        }
        text += `\nDB: ${CODEGRAPH_DB}\n`;
        ctx.ui.notify(text, "info");
      } catch (e: any) {
        ctx.ui.notify(`CodeGraph 状态查询失败: ${e.message}`, "error");
      }
    },
  });

  console.log(`${LOG_PREFIX} Extension 加载完成`);
}
