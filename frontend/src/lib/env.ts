const DEFAULT_PROXY_PREFIX = "/backend";

export const appConfig = {
  appName: "School ERP Web",
  apiProxyPrefix:
    process.env.NEXT_PUBLIC_API_PROXY_PREFIX ?? DEFAULT_PROXY_PREFIX,
};


