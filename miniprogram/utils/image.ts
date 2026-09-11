/** 使用微信系统编辑器裁剪、旋转并调整经营图片尺寸。 */
export function editImageForUpload(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.editImage({
      src: filePath,
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    });
  });
}

/** 使用微信系统裁剪器强制头像为正方形。 */
export function cropAvatarImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.cropImage({
      src: filePath,
      cropScale: "1:1",
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    });
  });
}
