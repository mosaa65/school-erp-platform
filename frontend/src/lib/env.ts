const DEFAULT_PROXY_PREFIX = "/backend";
const DEFAULT_RECAPTCHA_ACTION = "login";

export const appConfig = {
  appName: "School ERP Web",
  apiProxyPrefix:
    process.env.NEXT_PUBLIC_API_PROXY_PREFIX ?? DEFAULT_PROXY_PREFIX,
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "",
  recaptchaAction:
    process.env.NEXT_PUBLIC_RECAPTCHA_ACTION ?? DEFAULT_RECAPTCHA_ACTION,
};
