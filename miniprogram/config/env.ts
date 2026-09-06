type EnvironmentVersion = "develop" | "trial" | "release";

const environments: Record<EnvironmentVersion, { apiBaseUrl: string }> = {
  develop: { apiBaseUrl: "http://127.0.0.1:8081" },
  trial: { apiBaseUrl: "https://test-api.example.com/api" },
  release: { apiBaseUrl: "https://api.example.com/api" },
};

const deviceDevelopEnvironment = {
  apiBaseUrl: "http://192.168.2.109:8081",
};

export function getEnvironment(): { apiBaseUrl: string } {
  let version: EnvironmentVersion = "develop";
  try {
    version = wx.getAccountInfoSync().miniProgram.envVersion || "develop";
  } catch {
    version = "develop";
  }
  if (version === "develop") {
    try {
      if (wx.getDeviceInfo().platform !== "devtools") {
        return deviceDevelopEnvironment;
      }
    } catch {
      /* 获取设备信息失败时继续使用开发者工具地址。 */
    }
  }
  return environments[version];
}
