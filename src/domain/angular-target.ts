export const ANGULAR_VERSIONS = ["21", "20", "19", "18", "17"] as const;

export type AngularVersion = (typeof ANGULAR_VERSIONS)[number];

export interface AngularVersionProfile {
  version: AngularVersion;
  label: string;
  latestMinor: string;
  nodeRange: string;
  typeScriptRange: string;
  rxjsRange: string;
  signalStrategy: "stable-signal-store";
}

const ANGULAR_VERSION_PROFILES: Record<AngularVersion, AngularVersionProfile> = {
  "21": {
    version: "21",
    label: "Angular 21",
    latestMinor: "21.0.x",
    nodeRange: "^20.19.0 || ^22.12.0 || ^24.0.0",
    typeScriptRange: ">=5.9.0 <6.0.0",
    rxjsRange: "^6.5.3 || ^7.4.0",
    signalStrategy: "stable-signal-store"
  },
  "20": {
    version: "20",
    label: "Angular 20",
    latestMinor: "20.2.x || 20.3.x",
    nodeRange: "^20.19.0 || ^22.12.0 || ^24.0.0",
    typeScriptRange: ">=5.8.0 <6.0.0",
    rxjsRange: "^6.5.3 || ^7.4.0",
    signalStrategy: "stable-signal-store"
  },
  "19": {
    version: "19",
    label: "Angular 19",
    latestMinor: "19.2.x",
    nodeRange: "^18.19.1 || ^20.11.1 || ^22.0.0",
    typeScriptRange: ">=5.5.0 <5.9.0",
    rxjsRange: "^6.5.3 || ^7.4.0",
    signalStrategy: "stable-signal-store"
  },
  "18": {
    version: "18",
    label: "Angular 18",
    latestMinor: "18.1.x || 18.2.x",
    nodeRange: "^18.19.1 || ^20.11.1 || ^22.0.0",
    typeScriptRange: ">=5.4.0 <5.6.0",
    rxjsRange: "^6.5.3 || ^7.4.0",
    signalStrategy: "stable-signal-store"
  },
  "17": {
    version: "17",
    label: "Angular 17",
    latestMinor: "17.3.x",
    nodeRange: "^18.13.0 || ^20.9.0",
    typeScriptRange: ">=5.2.0 <5.5.0",
    rxjsRange: "^6.5.3 || ^7.4.0",
    signalStrategy: "stable-signal-store"
  }
};

export function getAngularVersionProfile(version: AngularVersion): AngularVersionProfile {
  return ANGULAR_VERSION_PROFILES[version];
}

export function buildCompatibilityBanner(version: AngularVersion, artifact: "contracts" | "service"): string {
  const profile = getAngularVersionProfile(version);
  const artifactLabel = artifact === "contracts" ? "TypeScript contracts" : "Angular service";

  return [
    `// Target: ${profile.label} (${profile.latestMinor})`,
    `// Artifact: ${artifactLabel}`,
    `// Compatible Node.js: ${profile.nodeRange}`,
    `// Compatible TypeScript: ${profile.typeScriptRange}`,
    `// Compatible RxJS: ${profile.rxjsRange}`
  ].join("\n");
}
