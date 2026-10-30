import imageCompression from 'browser-image-compression';

export async function compressPromptImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Aim for under 1MB for fast uploads and display
    maxWidthOrHeight: 1920, // 1080p is sufficient for high-quality web view
    useWebWorker: true,
    fileType: 'image/jpeg', // JPEG is generally more efficient for high-res art
    initialQuality: 0.85,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Image compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed, using original file:', error);
    return file;
  }
}
