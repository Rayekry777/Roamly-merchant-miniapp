type EnvironmentVersion = "develop" | "trial" | "release";

const environments: Record<EnvironmentVersion, { apiBaseUrl: string }> = {
  develop: { apiBaseUrl: "http://127.0.0.1:8081" },
  trial: { apiBaseUrl: "https://api.example.com/api" },
  release: { apiBaseUrl: "https://api.example.com/api" },
};

export function getEnvironment(): { apiBaseUrl: string } {
  const version = wx.getAccountInfoSync().miniProgram.envVersion;
  return environments[version];
}
