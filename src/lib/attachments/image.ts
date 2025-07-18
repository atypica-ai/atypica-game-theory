import "server-only";

import sharp from "sharp";

export async function resizeImageToWebP(
  buffer: Buffer,
  options: {
    minShortSide: number; // 短边最小尺寸
    maxLongSide: number; // 长边最大尺寸
  },
) {
  // 获取图片信息
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error("Cannot determine image dimensions");
  }

  // 计算新的尺寸
  const { newWidth, newHeight } = calculateNewDimensions({
    originalWidth: width,
    originalHeight: height,
    options,
  });

  // 处理图片
  const processedBuffer = await image
    .resize(newWidth, newHeight, {
      fit: "inside", // 保持宽高比
      withoutEnlargement: false, // 允许放大（如果原图太小）
    })
    .webp({
      quality: 85, // WebP 质量
      effort: 4, // 压缩努力程度 (0-6, 越高压缩越好但越慢)
    })
    .toBuffer();

  return processedBuffer;
}

function calculateNewDimensions({
  originalWidth,
  originalHeight,
  options,
}: {
  originalWidth: number;
  originalHeight: number;
  options: {
    minShortSide: number; // 短边最小尺寸
    maxLongSide: number; // 长边最大尺寸
  };
}) {
  // 确定短边和长边
  const isLandscape = originalWidth > originalHeight;
  const shortSide = isLandscape ? originalHeight : originalWidth;
  const longSide = isLandscape ? originalWidth : originalHeight;

  // 计算缩放比例
  let scale = 1;

  // 如果短边小于 minShortSide，需要放大
  if (shortSide < options.minShortSide) {
    scale = options.minShortSide / shortSide;
  }

  // 计算放大后的长边
  const newLongSide = longSide * scale;

  // 如果长边超过 maxLongSide，需要重新计算缩放比例
  if (newLongSide > options.maxLongSide) {
    scale = options.maxLongSide / longSide;
  }

  // 计算最终尺寸
  const newWidth = Math.round(originalWidth * scale);
  const newHeight = Math.round(originalHeight * scale);

  return { newWidth, newHeight };
}
