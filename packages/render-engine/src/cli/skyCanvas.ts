#!/usr/bin/env node
/**
 * sky-canvas CLI —— 对标 ego-browser 的 code-base 执行模型。
 *
 *   sky-canvas nodejs <<'EOF'
 *     loadScene({ nodes:[{ type:'rect', x:100, y:100, width:200, height:80, color:'#4a9eff' }] })
 *     applyOps([{ op:'add', node:{ type:'text', x:120, y:130, size:24, text:'Hi', color:'#fff' } }])
 *     cliLog(snapshotText())
 *     await renderPNG('out.png')
 *   EOF
 *
 * agent 写一段脚本、一次性调用多个预注入 helper、一趟执行完再回报——而不是
 * 一个工具一次往返。画布状态持久化在 workspace 文件里,跨多次调用累积。
 *
 * helper(camelCase,免 import):
 *   loadScene(scene)          全量装载一份 Scene(替换当前文档)
 *   snapshot(opts?)           结构化快照对象
 *   snapshotText(opts?)       文本快照(给 agent 读);opts.scope='viewport' 仅视口
 *   applyOps(ops)             批量应用一组 ops,返回 OpResult[]
 *   renderPNG(path?)          渲染当前画布为 PNG;给 path 则写文件返回路径,否则返回 Buffer
 *   getScene()                导出当前文档为 Scene
 *   cliLog(...args)           输出到 stdout(heredoc 内唯一输出通道)
 *   session                   底层 CanvasSession,需要时直接用
 *
 * 每次调用结束自动把画布状态存回 workspace(除非 --no-save)。
 */

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { CanvasSession, type CanvasSessionOptions } from '../runtime/CanvasSession'

interface CliArgs {
  command: string
  workspace: string
  width?: number
  height?: number
  save: boolean
  scriptFromArg?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: argv[0] ?? '',
    workspace: '.sky-canvas.json',
    save: true,
  }
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--workspace' || a === '-w') args.workspace = argv[++i]
    else if (a === '--width') args.width = Number(argv[++i])
    else if (a === '--height') args.height = Number(argv[++i])
    else if (a === '--no-save') args.save = false
    else if (a === '-e' || a === '--eval') args.scriptFromArg = argv[++i]
  }
  return args
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

/** 在预注入 helper 的上下文里执行一段用户脚本 */
async function runScript(source: string, session: CanvasSession): Promise<void> {
  const loadScene = (scene: Parameters<CanvasSession['loadScene']>[0]) => session.loadScene(scene)
  const snapshot = (opts?: Parameters<CanvasSession['snapshot']>[0]) => session.snapshot(opts)
  const snapshotText = (opts?: Parameters<CanvasSession['snapshotText']>[0]) => session.snapshotText(opts)
  const applyOps = (ops: Parameters<CanvasSession['applyOps']>[0]) => session.applyOps(ops)
  const getScene = () => session.toScene()
  const renderPNG = (path?: string) => (path ? session.renderToFile(path) : session.renderPNG())
  const cliLog = (...args: unknown[]) => {
    process.stdout.write(`${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`)
  }

  // 用 AsyncFunction 包裹,支持顶层 await;helper 作为形参注入(免 import)
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (...a: unknown[]) => Promise<void>
  const fn = new AsyncFunction(
    'session',
    'loadScene',
    'snapshot',
    'snapshotText',
    'applyOps',
    'getScene',
    'renderPNG',
    'cliLog',
    source
  )
  await fn(session, loadScene, snapshot, snapshotText, applyOps, getScene, renderPNG, cliLog)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.command !== 'nodejs' && args.command !== 'run') {
    process.stderr.write(
      'sky-canvas —— 面向 agent 的无头画布 CLI\n\n' +
        '用法:\n' +
        "  sky-canvas nodejs <<'EOF'   # 从 stdin 读脚本(heredoc)\n" +
        '  sky-canvas nodejs -e "<脚本>"  # 从参数读脚本\n\n' +
        '选项:\n' +
        '  -w, --workspace <file>  画布状态文件(默认 .sky-canvas.json)\n' +
        '  --width <n> --height <n>  出图尺寸(默认 800x600)\n' +
        '  --no-save               本次不把状态写回 workspace\n'
    )
    process.exit(args.command ? 1 : 0)
  }

  const opts: CanvasSessionOptions = {}
  if (args.width) opts.width = args.width
  if (args.height) opts.height = args.height

  // 从 workspace 恢复画布状态(存在则加载,否则空会话)
  let session: CanvasSession
  if (existsSync(args.workspace)) {
    session = CanvasSession.deserialize(await readFile(args.workspace, 'utf8'), opts)
  } else {
    session = new CanvasSession(opts)
  }

  const source = args.scriptFromArg ?? (await readStdin())
  try {
    await runScript(source, session)
  } catch (e) {
    process.stderr.write(`脚本执行失败: ${(e as Error).message}\n`)
    process.exit(1)
  }

  // 状态写回 workspace(跨调用累积)
  if (args.save) await writeFile(args.workspace, session.serialize())
}

main().catch((e) => {
  process.stderr.write(`sky-canvas 启动失败: ${(e as Error)?.message ?? String(e)}\n`)
  process.exit(1)
})
