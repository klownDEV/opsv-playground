import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import test from "node:test";

const serverPath = resolve("public/agent/opsv-agent-mcp.mjs");

function sessionFixture() {
  return {
    schema:"opsv-agent-session",
    version:1,
    challenge:{ id:"OPSV-006", slug:"requirements-shift", title:"Kravskiftet" },
    brief:{
      objective:"Bygg tavlan.",
      rounds:[
        { number:1, label:"FÖRSTA BRIEFEN", title:"Få tavlan att fungera", requirements:"Skapa, redigera och ta bort." },
        { number:2, label:"KUNDEN ÄNDRAR SIG", title:"Hitta och kom tillbaka", requirements:"Sök, filtrera och spara." },
        { number:3, label:"VERKLIGHETEN HÄNDER", title:"Gör den tålig", requirements:"Säker import, mobil och tangentbord." },
      ],
      rules:["Ändra endast sessionens tre filer."],
      verification:"Importera filen tillbaka i Playground.",
    },
    files:{
      html:'<form id="task-form"><label for="title">Titel</label><input name="title"><label for="owner">Ägare</label><input name="owner"><label for="status">Status</label><input name="status"><label for="due">Datum</label><input name="due"><label>Sök<input id="task-search"></label><label>Filter<select id="status-filter"></select></label></form><ul id="task-list"></ul><p class="empty-state"></p>',
      css:"*{box-sizing:border-box} input,button{min-height:44px;width:100%} input:focus-visible{outline:2px solid blue}",
      js:'const tasks=[{id:"1"},{id:"2"}]; function render(){ document.querySelector("#task-list").textContent=""; } render();',
    },
    metadata:{ source:"https://playground.opsv.dev/challenges/requirements-shift", exportedAt:"2026-08-29T08:00:00.000Z", revision:0 },
  };
}

function guardSessionFixture() {
  return {
    schema:"opsv-agent-session", version:1,
    challenge:{ id:"OPSV-007", slug:"mcp-guard", title:"MCP-vakten" },
    brief:{ objective:"Bygg en säker kontrollpanel.", rounds:[
      { number:1, label:"NORMAL TRAFIK", title:"Bygg kön", requirements:"Bedöm grundanrop." },
      { number:2, label:"POLICYN ÄNDRAS", title:"Tillämpa policy", requirements:"Hantera gränser och dubletter." },
      { number:3, label:"FIENTLIG INDATA", title:"Stoppa angrepp", requirements:"Blockera injektion och hemligheter." },
    ], rules:["Ändra endast sessionens tre filer."], verification:"Importera och kör 24 tester." },
    files:{ html:'<main><div id="request-list"></div><aside id="detail-panel"><div id="detail-decision"></div><button data-action="approve">Godkänn</button><button data-action="block">Blockera</button><ol id="audit-log"></ol></aside></main>', css:"*{box-sizing:border-box}button{min-height:44px}button:focus-visible{outline:2px solid blue}@media(max-width:600px){main{width:100%}}", js:'function evaluateAction(request,policy){const text=JSON.stringify(request);if(!policy.allowedTools.includes(request.tool)||text.includes("api_key")||text.includes("DELETE")||request.duplicateOf||request.authorizationExpires)return {decision:"block",reason:"Säkerhet"};if(request.action==="payment.create"&&request.payload.amount>policy.hardPaymentLimit)return {decision:"block",reason:"Belopp"};if(!policy.trustedRecipients.includes(request.payload?.recipient))return {decision:"block",reason:"Mottagare"};if(policy.privateReadMode==="block")return {decision:"block",reason:"Policy"};return {decision:"review",reason:"Granska"}} challengeStorage.setItem("audit","ok");document.querySelector("#request-list").textContent="allow review block ignore previous token password secret operation transfer";' },
    metadata:{ source:"https://playground.opsv.dev/challenges/mcp-guard", exportedAt:"2026-08-30T08:00:00.000Z", revision:0 },
  };
}

type JsonRpcResponse = { id?: number; result?: Record<string, unknown>; error?: Record<string, unknown> };

class McpProcess {
  private nextId = 1;
  private pending = new Map<number, (response: JsonRpcResponse) => void>();
  readonly child;
  readonly stderr: string[] = [];

  constructor(sessionPath: string) {
    this.child = spawn(process.execPath, [serverPath, sessionPath], { stdio:["pipe", "pipe", "pipe"] });
    createInterface({ input:this.child.stdout }).on("line", (line) => {
      const message = JSON.parse(line) as JsonRpcResponse;
      if (typeof message.id === "number") this.pending.get(message.id)?.(message);
    });
    this.child.stderr.on("data", (chunk) => this.stderr.push(String(chunk)));
  }

  request(method: string, params: Record<string, unknown> = {}) {
    const id = this.nextId++;
    const response = new Promise<JsonRpcResponse>((resolveResponse, rejectResponse) => {
      const timeout = setTimeout(() => rejectResponse(new Error(`MCP timeout för ${method}: ${this.stderr.join("")}`)), 4_000);
      this.pending.set(id, (message) => { clearTimeout(timeout); this.pending.delete(id); resolveResponse(message); });
    });
    this.child.stdin.write(`${JSON.stringify({ jsonrpc:"2.0", id, method, params })}\n`);
    return response;
  }

  notify(method: string, params: Record<string, unknown> = {}) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc:"2.0", method, params })}\n`);
  }

  async close() {
    this.child.stdin.end();
    await new Promise<void>((resolveClose) => {
      const timeout = setTimeout(() => { this.child.kill("SIGKILL"); resolveClose(); }, 1_000);
      this.child.once("exit", () => { clearTimeout(timeout); resolveClose(); });
    });
  }
}

test("local MCP edits only the scoped OPSV session and exposes five tools", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opsv-mcp-test-"));
  const sessionPath = join(directory, "session.json");
  const sentinelPath = join(directory, "do-not-touch.txt");
  await writeFile(sessionPath, JSON.stringify(sessionFixture()), "utf8");
  await writeFile(sentinelPath, "orörd", "utf8");
  const mcp = new McpProcess(sessionPath);
  const started = Date.now();

  try {
    const initialized = await mcp.request("initialize", { protocolVersion:"2025-11-25", capabilities:{}, clientInfo:{ name:"opsv-test", version:"1.0.0" } });
    assert.equal(initialized.error, undefined, JSON.stringify(initialized.error));
    mcp.notify("notifications/initialized");

    const listed = await mcp.request("tools/list");
    const tools = (listed.result?.tools as Array<{ name: string }>).map((tool) => tool.name);
    assert.deepEqual(tools, ["opsv_read_brief", "opsv_read_file", "opsv_write_file", "opsv_preflight", "opsv_session_status"]);

    const write = await mcp.request("tools/call", { name:"opsv_write_file", arguments:{ name:"css", content:"*{box-sizing:border-box}button{min-height:44px}" } });
    assert.equal(write.error, undefined, JSON.stringify(write.error));

    const preflight = await mcp.request("tools/call", { name:"opsv_preflight", arguments:{} });
    assert.equal(preflight.error, undefined, JSON.stringify(preflight.error));
    const preflightText = (preflight.result?.content as Array<{ type: string; text: string }>)[0].text;
    assert.equal((JSON.parse(preflightText) as { executedCode: boolean }).executedCode, false);

    const invalid = await mcp.request("tools/call", { name:"opsv_write_file", arguments:{ name:"secrets", content:"nej" } });
    assert.ok(invalid.error || invalid.result?.isError, "okänt filnamn ska stoppas");

    const saved = JSON.parse(await readFile(sessionPath, "utf8")) as ReturnType<typeof sessionFixture>;
    assert.equal(saved.files.css, "*{box-sizing:border-box}button{min-height:44px}");
    assert.equal(saved.metadata.revision, 1);
    assert.equal(await readFile(sentinelPath, "utf8"), "orörd");
    assert.ok(Date.now() - started < 4_000, "MCP-start och grundflöde ska vara snabbt");
  } finally {
    await mcp.close();
    await rm(directory, { recursive:true, force:true });
  }
});

test("local MCP refuses a symbolic-link session", async () => {
  const directory = await mkdtemp(join(tmpdir(), "opsv-mcp-link-test-"));
  const targetPath = join(directory, "target.json");
  const linkPath = join(directory, "session-link.json");
  await writeFile(targetPath, JSON.stringify(sessionFixture()), "utf8");
  await symlink(targetPath, linkPath);
  const child = spawn(process.execPath, [serverPath, linkPath], { stdio:["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const exitCode = await new Promise<number | null>((resolveExit) => child.once("exit", resolveExit));
  assert.equal(exitCode, 1);
  assert.match(stderr, /vanlig fil/i);
  await rm(directory, { recursive:true, force:true });
});

test("local MCP accepts MCP-vakten and uses its security preflight", async () => {
  const directory=await mkdtemp(join(tmpdir(),"opsv-mcp-guard-test-"));
  const sessionPath=join(directory,"guard.json");
  await writeFile(sessionPath,JSON.stringify(guardSessionFixture()),"utf8");
  const mcp=new McpProcess(sessionPath);
  try {
    const initialized=await mcp.request("initialize",{protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"opsv-test",version:"1.0.0"}});
    assert.equal(initialized.error,undefined,JSON.stringify(initialized.error)); mcp.notify("notifications/initialized");
    const preflight=await mcp.request("tools/call",{name:"opsv_preflight",arguments:{}});
    assert.equal(preflight.error,undefined,JSON.stringify(preflight.error));
    const text=(preflight.result?.content as Array<{text:string}>)[0].text;
    const result=JSON.parse(text) as {executedCode:boolean;total:number};
    assert.equal(result.executedCode,false); assert.equal(result.total,15);
  } finally { await mcp.close(); await rm(directory,{recursive:true,force:true}); }
});
