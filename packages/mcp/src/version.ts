import packageJson from "../package.json" with { type: "json" };

export const PACKAGE_VERSION = packageJson.version;
