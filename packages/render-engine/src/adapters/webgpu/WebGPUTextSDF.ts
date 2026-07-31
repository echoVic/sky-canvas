/**
 * 运行时 SDF 字形图集构建
 *
 * 用 canvas 2D 把字符渲染为覆盖位图,再用 8SSEDT(8-point Signed Euclidean
 * Distance Transform)算出有符号距离场(SDF),打包进一张图集纹理。
 * SDF 图集的好处:着色器里用 smoothstep 阈值即可得到与缩放无关的清晰边缘,
 * 一张中等分辨率图集就能支撑任意字号,无需为每个字号单独光栅化。
 *
 * 距离变换本身是纯函数(computeSDF),不依赖 DOM,可单测;
 * 图集光栅化(buildGlyphAtlas)依赖 canvas 2D,运行在浏览器。
 */

/** 单个字形在图集中的位置与度量(均为图集像素/字体单位) */
export interface GlyphMetric {
  /** 图集中的 UV 矩形(0~1) */
  u0: number
  v0: number
  u1: number
  v1: number
  /** 字形位图宽高(图集像素) */
  width: number
  height: number
  /** 相对基线的绘制偏移 */
  bearingX: number
  bearingY: number
  /** 前进宽度(布局用) */
  advance: number
}

export interface GlyphAtlas {
  /** 图集像素数据(RGBA,SDF 存于各通道) */
  data: Uint8ClampedArray
  width: number
  height: number
  /** 字符 -> 度量 */
  glyphs: Map<string, GlyphMetric>
  /** 生成时的字体像素高(布局缩放基准) */
  fontSize: number
  /** SDF 距离范围(像素),着色器换算 alpha 用 */
  spread: number
}

/**
 * 8SSEDT 有符号距离变换。
 * 输入 alpha 覆盖(0~1,>=0.5 视为字形内部),输出每像素到最近边缘的有符号距离
 * (内部为负、外部为正,单位:像素)。
 */
export function computeSDF(coverage: Float32Array, width: number, height: number): Float32Array {
  const INF = 1e9
  const n = width * height
  // 两个网格:inside(到外部最近点距离) / outside(到内部最近点距离)
  // 每个格点存到最近"对立像素"的位移向量 (dx, dy)
  const gx = new Float32Array(n)
  const gy = new Float32Array(n)
  const fx = new Float32Array(n)
  const fy = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const inside = coverage[i] >= 0.5
    // outside 网格:内部像素距离 0,外部像素 INF
    if (inside) {
      gx[i] = 0
      gy[i] = 0
    } else {
      gx[i] = INF
      gy[i] = INF
    }
    // inside 网格:外部像素距离 0,内部像素 INF
    if (inside) {
      fx[i] = INF
      fy[i] = INF
    } else {
      fx[i] = 0
      fy[i] = 0
    }
  }

  edt8(gx, gy, width, height)
  edt8(fx, fy, width, height)

  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const distOut = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i])
    const distIn = Math.sqrt(fx[i] * fx[i] + fy[i] * fy[i])
    // 内部为负,外部为正
    out[i] = distOut - distIn
  }
  return out
}

/** 8SSEDT 核心:两趟扫描传播最近位移向量 */
function edt8(gx: Float32Array, gy: Float32Array, width: number, height: number): void {
  const idx = (x: number, y: number) => y * width + x
  const compare = (
    x: number,
    y: number,
    ox: number,
    oy: number,
    curX: number,
    curY: number
  ): [number, number] => {
    if (x + ox < 0 || x + ox >= width || y + oy < 0 || y + oy >= height) return [curX, curY]
    const ni = idx(x + ox, y + oy)
    const nx = gx[ni] + ox
    const ny = gy[ni] + oy
    if (nx * nx + ny * ny < curX * curX + curY * curY) return [nx, ny]
    return [curX, curY]
  }

  // 上到下,左上/上/右上/左
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y)
      let cx = gx[i]
      let cy = gy[i]
      ;[cx, cy] = compare(x, y, -1, 0, cx, cy)
      ;[cx, cy] = compare(x, y, 0, -1, cx, cy)
      ;[cx, cy] = compare(x, y, -1, -1, cx, cy)
      ;[cx, cy] = compare(x, y, 1, -1, cx, cy)
      gx[i] = cx
      gy[i] = cy
    }
    for (let x = width - 1; x >= 0; x--) {
      const i = idx(x, y)
      let cx = gx[i]
      let cy = gy[i]
      ;[cx, cy] = compare(x, y, 1, 0, cx, cy)
      gx[i] = cx
      gy[i] = cy
    }
  }
  // 下到上
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = idx(x, y)
      let cx = gx[i]
      let cy = gy[i]
      ;[cx, cy] = compare(x, y, 1, 0, cx, cy)
      ;[cx, cy] = compare(x, y, 0, 1, cx, cy)
      ;[cx, cy] = compare(x, y, 1, 1, cx, cy)
      ;[cx, cy] = compare(x, y, -1, 1, cx, cy)
      gx[i] = cx
      gy[i] = cy
    }
    for (let x = 0; x < width; x++) {
      const i = idx(x, y)
      let cx = gx[i]
      let cy = gy[i]
      ;[cx, cy] = compare(x, y, -1, 0, cx, cy)
      gx[i] = cx
      gy[i] = cy
    }
  }
}

/**
 * 把有符号距离场编码进单通道 0~255。距离 0(边缘)映射到 128,
 * spread 像素内线性过渡,超出夹紧。着色器里 (v/255 - 0.5) 还原归一化距离。
 */
export function encodeSDF(sdf: Float32Array, spread: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(sdf.length)
  for (let i = 0; i < sdf.length; i++) {
    const d = sdf[i] / spread // 归一化到 [-1, 1] 附近
    out[i] = Math.round((0.5 - d * 0.5) * 255)
  }
  return out
}

/** 构建图集的参数 */
export interface BuildAtlasOptions {
  /** 需要包含的字符集(去重后逐个光栅化) */
  chars?: string
  /** 光栅化字号(像素),越大 SDF 越精细但图集越大 */
  fontSize?: number
  /** SDF 距离范围(像素) */
  spread?: number
  /** 字体族 */
  fontFamily?: string
  /** 图集每格内边距(容纳 spread 溢出) */
  padding?: number
}

const DEFAULT_CHARS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'

/**
 * 用 canvas 2D 构建 SDF 字形图集(浏览器环境)。
 * 每个字符:fillText → 取 alpha 覆盖 → computeSDF → encodeSDF → 拷进图集网格。
 * 图集为 RGBA,SDF 值写入 R/G/B/A 全通道(便于用 alpha 采样)。
 */
export function buildGlyphAtlas(opts: BuildAtlasOptions = {}): GlyphAtlas {
  const chars = Array.from(new Set(Array.from(opts.chars ?? DEFAULT_CHARS)))
  const fontSize = opts.fontSize ?? 48
  const spread = opts.spread ?? 6
  const fontFamily = opts.fontFamily ?? 'sans-serif'
  const padding = opts.padding ?? Math.ceil(spread) + 2

  const cell = fontSize + padding * 2
  const cols = Math.ceil(Math.sqrt(chars.length))
  const rows = Math.ceil(chars.length / cols)
  const atlasW = cols * cell
  const atlasH = rows * cell

  const canvas = document.createElement('canvas')
  canvas.width = cell
  canvas.height = cell
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法创建 canvas 2D 上下文用于字形图集')
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'

  const atlas = new Uint8ClampedArray(atlasW * atlasH * 4)
  const glyphs = new Map<string, GlyphMetric>()
  const baseline = padding + fontSize * 0.8

  chars.forEach((ch, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    ctx.clearRect(0, 0, cell, cell)
    const metrics = ctx.measureText(ch)
    const advance = metrics.width
    ctx.fillText(ch, padding, baseline)

    // 取 alpha 覆盖
    const img = ctx.getImageData(0, 0, cell, cell)
    const cov = new Float32Array(cell * cell)
    for (let p = 0; p < cell * cell; p++) cov[p] = img.data[p * 4 + 3] / 255
    const sdf = computeSDF(cov, cell, cell)
    const enc = encodeSDF(sdf, spread)

    // 拷进图集(全通道写 SDF)
    const ox = col * cell
    const oy = row * cell
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const v = enc[y * cell + x]
        const dst = ((oy + y) * atlasW + (ox + x)) * 4
        atlas[dst] = v
        atlas[dst + 1] = v
        atlas[dst + 2] = v
        atlas[dst + 3] = v
      }
    }

    glyphs.set(ch, {
      u0: ox / atlasW,
      v0: oy / atlasH,
      u1: (ox + cell) / atlasW,
      v1: (oy + cell) / atlasH,
      width: cell,
      height: cell,
      bearingX: padding,
      bearingY: baseline,
      advance,
    })
  })

  return { data: atlas, width: atlasW, height: atlasH, glyphs, fontSize, spread }
}

/** 单个字形排版后的实例(世界坐标) */
export interface GlyphInstance {
  x: number
  y: number
  width: number
  height: number
  u0: number
  v0: number
  u1: number
  v1: number
}

/**
 * 把一段文字按图集度量排版成 glyph 实例列表(纯函数,可单测)。
 * @param text 文本
 * @param atlas 图集
 * @param x,y 起点(基线左端)世界坐标
 * @param pxSize 目标字号(世界单位)
 */
export function layoutText(
  text: string,
  atlas: GlyphAtlas,
  x: number,
  y: number,
  pxSize: number
): GlyphInstance[] {
  const scale = pxSize / atlas.fontSize
  const out: GlyphInstance[] = []
  let penX = x
  for (const ch of text) {
    const g = atlas.glyphs.get(ch)
    if (!g) continue
    if (ch !== ' ') {
      out.push({
        x: penX,
        y: y - g.bearingY * scale,
        width: g.width * scale,
        height: g.height * scale,
        u0: g.u0,
        v0: g.v0,
        u1: g.u1,
        v1: g.v1,
      })
    }
    penX += g.advance * scale
  }
  return out
}
