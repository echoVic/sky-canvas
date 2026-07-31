/**
 * 浏览器直连 Anthropic:把「当前画布快照 + 自然语言指令」变成一组 ops。
 *
 * 这是阶段 C 闭环的最后一环——证明 LLM 能读 snapshot、吐合法 ops。
 * 仅用于本地 demo:Key 存内存、直连官方 API(需开启 anthropic-dangerous-direct-browser-access)。
 */
import type { SceneOp } from '@sky-canvas/render-engine/scene'

const SYSTEM = `你是画布编辑助手。用户给你一份画布快照和一句编辑指令,你只输出一个 JSON 数组,数组元素是编辑操作(op)。

快照格式:每行一个对象 "@短号 #稳定id 类型 几何 颜色"。用 #稳定id 引用对象(不要用 @短号)。

支持的 op(严格按此 schema,坐标为世界坐标,颜色为 hex 字符串):
- {"op":"add","node":{...},"id"?:"自定义id"}  node 同 Scene 节点:rect{x,y,width,height,color?} / circle{cx,cy,radius,color?} / line{x1,y1,x2,y2,width?,color?} / text{x,y,size,text,color?}
- {"op":"update","id":"n1","patch":{"color":"#3fb950"}}  局部改字段(不能改 type)
- {"op":"move","id":"n1","dx":0,"dy":40}  相对位移(id 也可是分组 g1)
- {"op":"remove","id":"n1"}
- {"op":"connect","from":"n1","to":"n2","color"?:"#fff","width"?:2}  连线
- {"op":"group","members":["n1","n2"],"id"?:"g1"}  分组
- {"op":"setViewport","viewport":{"x":0,"y":0,"zoom":1}}

只输出 JSON 数组本身,不要 markdown 代码块,不要解释。`

interface LLMResult {
  ops: SceneOp[]
  raw: string
}

/** 从模型返回文本里抽出 JSON 数组(容忍 ```json 包裹或前后噪声) */
function extractOps(text: string): SceneOp[] {
  let s = text.trim()
  // 去掉 markdown 代码围栏
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  // 若仍有前后噪声,截取首个 [ 到末个 ]
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  const parsed = JSON.parse(s)
  if (!Array.isArray(parsed)) throw new Error('模型未返回数组')
  return parsed as SceneOp[]
}

export async function requestOps(params: {
  apiKey: string
  model: string
  snapshotText: string
  instruction: string
}): Promise<LLMResult> {
  const { apiKey, model, snapshotText, instruction } = params
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `当前画布快照:\n${snapshotText}\n\n编辑指令:${instruction}`,
        },
      ],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 300)}`)
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const raw = (data.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('')
  return { ops: extractOps(raw), raw }
}
