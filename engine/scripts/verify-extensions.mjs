#!/usr/bin/env node
// 扩展健康回归测试：沙盒加载每个 steel-will-*.ts，验证能 import、能注册命令与事件。
// 用法: node engine/scripts/verify-extensions.mjs [扩展目录]
// ponytail: 只做加载期校验（模块顶层 + default(pi) 调用），不跑事件回调；回调内错误由运行时暴露。
import fs from "fs";
import path from "path";
import os from "os";
import { pathToFileURL } from "url";

const HOME = process.env.HOME || os.homedir();
const AG = process.env.PI_HOME ? path.join(process.env.PI_HOME, "agent") : path.join(HOME, ".pi", "agent");
const EXT = path.resolve(process.argv[2] || path.join(AG, "extensions"));
const ROOT = process.env.PI_MANAGED_INSTALL_ROOT || path.join(AG, "install");
const ver = fs.readFileSync(path.join(ROOT, "current-version"), "utf8").trim();
const NM = path.join(ROOT, "releases", ver, "node_modules");
const PIROOT = path.join(NM, "@earendil-works", "pi-coding-agent");

// 注意：本脚本以"安装后"的目录为校验目标（默认 ~/.pi/agent/extensions）。
// 该目录下扩展的相对导入 "../services/*" 指向 $AG/services（attach.sh 已装）。
// 直接对仓库内 extensions/ 校验时，6 个依赖 services 的扩展会解析失败，属预期。
const { createJiti } = await import(pathToFileURL(path.join(NM, "jiti", "lib", "jiti-static.mjs")).href);
const jiti = createJiti(import.meta.url, {
  alias: {
    "typebox": path.join(NM, "typebox", "build", "index.mjs"),
    "typebox/compile": path.join(NM, "typebox", "build", "compile", "index.mjs"),
    "typebox/value": path.join(NM, "typebox", "build", "value", "index.mjs"),
    "@earendil-works/pi-coding-agent": path.join(PIROOT, "dist", "index.js"),
  },
});

let ok = 0, bad = 0;
const cmds = new Map();
for (const f of fs.readdirSync(EXT).filter((x) => x.endsWith(".ts")).sort()) {
  const calls = [];
  const pi = new Proxy({}, { get: (_t, k) => (...a) => { calls.push(String(k) + ":" + (typeof a[0] === "string" ? a[0] : "")); } });
  try {
    const fn = jiti(path.join(EXT, f)).default;
    if (typeof fn !== "function") throw new Error("缺少 default 函数导出");
    fn(pi);
    const c = calls.filter((x) => x.startsWith("registerCommand:")).map((x) => x.split(":")[1]);
    for (const n of c) cmds.set(n, [...(cmds.get(n) || []), f]);
    console.log(`✅ ${f}  | 命令${c.length} 事件${calls.filter((x) => x.startsWith("on:")).length}`);
    ok++;
  } catch (e) {
    console.log(`❌ ${f}  → ${(e.message || String(e)).slice(0, 200)}`);
    bad++;
  }
}
const dup = [...cmds.entries()].filter(([, v]) => v.length > 1);
console.log(`\n合计: OK ${ok} / 失败 ${bad}  |  命令总数 ${cmds.size}  |  冲突 ${dup.length}`);
if (dup.length) dup.forEach(([n, v]) => console.log(`⚠ 命令冲突: ${n} ← ${v.join(", ")}`));
process.exit(bad || dup.length ? 1 : 0);
