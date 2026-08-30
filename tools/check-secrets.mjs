#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root=process.cwd();
const skippedDirectories=new Set([".git",".next",".vercel",".agents",".codex",".openai","node_modules","coverage","dist","out"]);
const skippedFiles=new Set([".env.local","public/agent/opsv-agent-mcp.mjs","public/agent/opsv-agent-mcp.source.ts"]);
const binaryExtensions=new Set([".jpg",".jpeg",".png",".gif",".webp",".ico",".woff",".woff2",".pdf",".zip"]);
const findings=[];
let scanned=0;

const patterns=[
  ["privat nyckel",/-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
  ["GitHub-token",/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/],
  ["AWS access key",/\bAKIA[0-9A-Z]{16}\b/],
  ["Google API-nyckel",/\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["Slack-token",/\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
  ["OpenAI-nyckel",/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["JWT",/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ["ifylld hemlig miljövariabel",/^\s*(?:AUTH_SECRET|DISCORD_CLIENT_SECRET|VERCEL_OIDC_TOKEN)\s*=\s*[^\s#][^\r\n]*$/m],
];

async function walk(directory) {
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    if (entry.isSymbolicLink()) continue;
    const path=join(directory,entry.name),name=relative(root,path).replaceAll("\\","/");
    if (entry.isDirectory()) { if (!skippedDirectories.has(entry.name)) await walk(path); continue; }
    if (skippedFiles.has(name)||binaryExtensions.has(extname(entry.name).toLowerCase())) continue;
    const content=await readFile(path,"utf8").catch(()=>null); if (content===null||content.includes("\0")) continue;
    scanned+=1;
    for (const [label,pattern] of patterns) if (pattern.test(content)) findings.push(`${name}: ${label}`);
    for (const match of content.matchAll(/postgres(?:ql)?:\/\/([^\s:@/]+):([^\s@/]+)@/g)) {
      const user=match[1],password=match[2];
      if (!(["user","placeholder"].includes(user)&&["password","placeholder"].includes(password))) findings.push(`${name}: databas-URL med inbäddade uppgifter`);
    }
  }
}

const gitignore=await readFile(join(root,".gitignore"),"utf8");
for (const required of [".env*","!.env.example",".vercel","/.agents/"]) if (!gitignore.includes(required)) findings.push(`.gitignore: saknar skyddsregel ${required}`);
await walk(root);

if (findings.length) { console.error("Säkerhetskontrollen stoppade publicering:\n"+findings.map(item=>`- ${item}`).join("\n")); process.exit(1); }
console.log(`Secret scan godkänd: ${scanned} textfiler kontrollerade, inga högriskhemligheter hittades.`);
