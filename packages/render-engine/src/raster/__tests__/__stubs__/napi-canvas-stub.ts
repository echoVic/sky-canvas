/**
 * 测试桩:@napi-rs/canvas 是可选原生依赖(CI/本环境未安装)。
 * 这里提供一个可被 Vite 静态解析的空壳,真正的 mock 由各测试的 vi.mock 覆盖。
 * 仅用于让 import-analysis 有可解析目标,不参与实际渲染。
 */
export function createCanvas(_w: number, _h: number): unknown {
  throw new Error('napi-canvas-stub: should be overridden by vi.mock in tests')
}
