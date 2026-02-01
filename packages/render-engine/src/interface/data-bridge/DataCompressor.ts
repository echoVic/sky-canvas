/**
 * 数据压缩器
 * 提供简单的数据压缩和解压功能
 */

import type { CompressionResult } from './DataBridgeTypes'

/**
 * 压缩数据结构
 */
interface CompressedData {
  data: string
  subs: Record<string, string>
}

/**
 * 数据压缩器
 */
export class DataCompressor {
  private compressionThreshold = 1024 // 1KB

  /**
   * 压缩数据
   */
  compress<T>(data: T): CompressionResult<T | string> {
    const originalString = JSON.stringify(data)
    const originalSize = originalString.length

    if (originalSize < this.compressionThreshold) {
      return {
        compressed: false,
        data,
        originalSize,
        compressedSize: originalSize,
      }
    }

    try {
      const compressed = this.simpleCompress(originalString)
      const compressedSize = compressed.length

      if (compressedSize >= originalSize) {
        return {
          compressed: false,
          data,
          originalSize,
          compressedSize: originalSize,
        }
      }

      return {
        compressed: true,
        data: compressed,
        originalSize,
        compressedSize,
      }
    } catch (error) {
      console.warn('Data compression failed:', error)
      return {
        compressed: false,
        data,
        originalSize,
        compressedSize: originalSize,
      }
    }
  }

  /**
   * 解压数据
   */
  decompress<T>(compressedData: unknown, wasCompressed: boolean): T {
    if (!wasCompressed) {
      return compressedData as T
    }

    try {
      const decompressed = this.simpleDecompress(compressedData as string)
      return JSON.parse(decompressed)
    } catch (error) {
      console.error('Data decompression failed:', error)
      throw error
    }
  }

  /**
   * 简单的字符串压缩
   * 注：实际项目中建议使用专业的压缩库如 lz-string
   */
  private simpleCompress(str: string): string {
    const freq: Record<string, number> = {}
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1
    }

    const substitutions: Record<string, string> = {}
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])

    let substitutionCode = 0
    for (const [char, count] of sorted.slice(0, 10)) {
      if (count > 3 && char.length === 1) {
        substitutions[char] = String.fromCharCode(0xe000 + substitutionCode++)
      }
    }

    let compressed = str
    for (const [original, replacement] of Object.entries(substitutions)) {
      compressed = compressed.split(original).join(replacement)
    }

    return JSON.stringify({ data: compressed, subs: substitutions })
  }

  /**
   * 简单的字符串解压
   */
  private simpleDecompress(compressedStr: string): string {
    try {
      const parsed = JSON.parse(compressedStr) as CompressedData
      let decompressed = parsed.data

      for (const [original, replacement] of Object.entries(parsed.subs)) {
        decompressed = decompressed.split(replacement).join(original)
      }

      return decompressed
    } catch {
      return compressedStr
    }
  }
}
