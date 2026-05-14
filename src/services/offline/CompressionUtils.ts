// Compression utilities for Bible content storage
// Uses browser-native compression APIs when available

export class CompressionUtils {
  /**
   * Compress text data using browser's native compression
   * Falls back to simple encoding if compression is not available
   */
  static async compressText(text: string): Promise<Uint8Array> {
    try {
      // Check if CompressionStream is available (modern browsers)
      if ('CompressionStream' in window) {
        const blob = new Blob([text]);
        const stream = blob.stream();
        const compressedStream = stream.pipeThrough(
          new CompressionStream('gzip')
        );
        const compressedBlob = await new Response(compressedStream).blob();
        const arrayBuffer = await compressedBlob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } catch (error) {
      console.warn('Compression failed, using uncompressed storage:', error);
    }

    // Fallback: just encode as UTF-8
    return new TextEncoder().encode(text);
  }

  /**
   * Decompress data back to text
   */
  static async decompressText(data: Uint8Array): Promise<string> {
    try {
      // Check if DecompressionStream is available
      if ('DecompressionStream' in window) {
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        const blob = new Blob([arrayBuffer]);
        const stream = blob.stream();
        const decompressedStream = stream.pipeThrough(
          new DecompressionStream('gzip')
        );
        const decompressedBlob = await new Response(decompressedStream).blob();
        return await decompressedBlob.text();
      }
    } catch (error) {
      console.warn('Decompression failed, trying direct decode:', error);
    }

    // Fallback: decode as UTF-8
    return new TextDecoder().decode(data);
  }

  /**
   * Compress JSON object
   */
  static async compressJSON(obj: any): Promise<Uint8Array> {
    const json = JSON.stringify(obj);
    return this.compressText(json);
  }

  /**
   * Decompress to JSON object
   */
  static async decompressJSON<T = any>(data: Uint8Array): Promise<T> {
    const text = await this.decompressText(data);
    return JSON.parse(text);
  }

  /**
   * Calculate compression ratio
   */
  static calculateCompressionRatio(original: string, compressed: Uint8Array): number {
    const originalSize = new TextEncoder().encode(original).length;
    const compressedSize = compressed.length;
    return compressedSize / originalSize;
  }

  /**
   * Check if compression is supported
   */
  static isCompressionSupported(): boolean {
    return 'CompressionStream' in window && 'DecompressionStream' in window;
  }

  /**
   * Estimate compressed size without actually compressing
   * Uses a heuristic based on typical Bible text compression ratios
   */
  static estimateCompressedSize(text: string): number {
    const uncompressedSize = new TextEncoder().encode(text).length;
    // Bible text typically compresses to about 30-40% of original size
    const estimatedRatio = 0.35;
    return Math.ceil(uncompressedSize * estimatedRatio);
  }
}
