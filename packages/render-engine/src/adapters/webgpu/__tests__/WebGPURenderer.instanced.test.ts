import { describe, expect, it } from 'vitest'
import { packRectInstances, RECT_INSTANCE_STRIDE, type RectInstance } from '../WebGPURenderer'

describe('packRectInstances', () => {
  it('每实例打包为 8 个 float,布局为 [x,y,w,h,r,g,b,a]', () => {
    const rects: RectInstance[] = [
      { x: 10, y: 20, width: 30, height: 40, color: { r: 0.1, g: 0.2, b: 0.3, a: 1 } },
    ]
    const data = packRectInstances(rects)
    expect(data).toBeInstanceOf(Float32Array)
    expect(data.length).toBe(RECT_INSTANCE_STRIDE)
    expect(Array.from(data)).toEqual([
      10,
      20,
      30,
      40,
      // 颜色用 float32,需近似比较
      expect.closeTo(0.1, 5),
      expect.closeTo(0.2, 5),
      expect.closeTo(0.3, 5),
      1,
    ])
  })

  it('多个实例按顺序连续排布,总长 = n * 8', () => {
    const rects: RectInstance[] = [
      { x: 1, y: 2, width: 3, height: 4, color: { r: 0, g: 0, b: 0, a: 1 } },
      { x: 5, y: 6, width: 7, height: 8, color: { r: 1, g: 1, b: 1, a: 1 } },
      { x: 9, y: 10, width: 11, height: 12, color: { r: 0.5, g: 0.5, b: 0.5, a: 0.5 } },
    ]
    const data = packRectInstances(rects)
    expect(data.length).toBe(3 * RECT_INSTANCE_STRIDE)
    // 第二个实例从 offset 8 开始
    expect(data[8]).toBe(5)
    expect(data[9]).toBe(6)
    expect(data[10]).toBe(7)
    expect(data[11]).toBe(8)
    // 第三个实例的 x 在 offset 16
    expect(data[16]).toBe(9)
  })

  it('空数组返回空 Float32Array', () => {
    const data = packRectInstances([])
    expect(data.length).toBe(0)
  })
})
