export default {
  providers: [
    {
      domain: (globalThis as any).process?.env?.CONVEX_SITE_URL || "",
      applicationID: "convex",
    },
  ],
};
