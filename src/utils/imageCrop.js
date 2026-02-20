/**
 * Create a 512x512 crop from an image
 * @param {string} imageSrc - Source image URL
 * @param {Object} cropBox - Crop box with startX, startY, width, height
 * @param {Object} imageScale - Scale information
 * @returns {Promise<Blob>} - PNG blob of the cropped image
 */
export async function createCrop(imageSrc, cropBox, imageScale) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const img = new Image();
  img.src = imageSrc;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  
  const actualStartX = cropBox.width >= 0 ? cropBox.startX : cropBox.startX + cropBox.width;
  const actualStartY = cropBox.height >= 0 ? cropBox.startY : cropBox.startY + cropBox.height;
  
  const cropX = actualStartX / imageScale.scaleX;
  const cropY = actualStartY / imageScale.scaleY;
  const cropWidth = Math.abs(cropBox.width) / imageScale.scaleX;
  const cropHeight = Math.abs(cropBox.height) / imageScale.scaleY;
  
  ctx.drawImage(
    img,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, 512, 512
  );
  
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

/**
 * Get crop metadata for storage
 */
export function getCropMetadata(cropBox, imageScale, originalFileName, label) {
  const actualStartX = cropBox.width >= 0 ? cropBox.startX : cropBox.startX + cropBox.width;
  const actualStartY = cropBox.height >= 0 ? cropBox.startY : cropBox.startY + cropBox.height;
  
  return {
    originalImage: originalFileName,
    cropLocation: {
      x: Math.round(actualStartX / imageScale.scaleX),
      y: Math.round(actualStartY / imageScale.scaleY),
      width: Math.round(Math.abs(cropBox.width) / imageScale.scaleX),
      height: Math.round(Math.abs(cropBox.height) / imageScale.scaleY)
    },
    label: label
  };
}