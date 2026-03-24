/**
 * Client-side image compression using Canvas API.
 * Resizes and compresses images before uploading to save storage space.
 */

interface CompressOptions {
  /** Max width in pixels (default: 1920) */
  maxWidth?: number;
  /** Max height in pixels (default: 1920) */
  maxHeight?: number;
  /** JPEG/WebP quality 0-1 (default: 0.8) */
  quality?: number;
  /** Output format (default: 'image/webp', fallback 'image/jpeg') */
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
  /** Max file size in bytes — if already smaller, skip compression */
  maxSizeBytes?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'image/webp',
  maxSizeBytes: 500_000, // 500KB
};

/**
 * Compress an image file using the browser Canvas API.
 * Returns a new File with reduced size. If the image is already small
 * enough or not an image, the original file is returned unchanged.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith('image/')) return file;
  // Skip SVGs (vector, no compression needed)
  if (file.type === 'image/svg+xml') return file;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip if already small enough
  if (file.size <= opts.maxSizeBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // Calculate new dimensions maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (newWidth > opts.maxWidth) {
      newHeight = Math.round((newHeight * opts.maxWidth) / newWidth);
      newWidth = opts.maxWidth;
    }
    if (newHeight > opts.maxHeight) {
      newWidth = Math.round((newWidth * opts.maxHeight) / newHeight);
      newHeight = opts.maxHeight;
    }

    // Draw to canvas
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    bitmap.close();

    // Try WebP first, fallback to JPEG
    let blob = await canvas.convertToBlob({
      type: opts.format,
      quality: opts.quality,
    });

    // If WebP not supported or larger than original, try JPEG
    if (blob.size >= file.size && opts.format === 'image/webp') {
      blob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: opts.quality,
      });
    }

    // If still larger, return original
    if (blob.size >= file.size) return file;

    const ext = opts.format === 'image/webp' ? 'webp' : 'jpg';
    const newName = file.name.replace(/\.[^.]+$/, `.${ext}`);

    return new File([blob], newName, { type: blob.type });
  } catch {
    // If compression fails for any reason, return original
    return file;
  }
}

/**
 * Get a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
