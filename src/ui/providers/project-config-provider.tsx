"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { ANGULAR_VERSIONS, AngularVersion } from "@/domain/angular-target";

interface ProjectConfigState {
  projectName: string;
  projectIdentifier: string;
  angularVersion: AngularVersion;
}

interface ProjectConfigContextValue extends ProjectConfigState {
  setProjectName: (value: string) => void;
  setProjectIdentifier: (value: string) => void;
  setAngularVersion: (value: AngularVersion) => void;
}

const ProjectConfigContext = createContext<ProjectConfigContextValue | null>(null);

export function ProjectConfigProvider({ children }: { children: ReactNode }) {
  const [projectName, setProjectName] = useState("ContractFlow");
  const [projectIdentifier, setProjectIdentifier] = useState("contract-flow");
  const [angularVersion, setAngularVersion] = useState<AngularVersion>(ANGULAR_VERSIONS[0]);

  const value = useMemo(
    () => ({
      projectName,
      projectIdentifier,
      angularVersion,
      setProjectName,
      setProjectIdentifier,
      setAngularVersion
    }),
    [angularVersion, projectIdentifier, projectName]
  );

  return <ProjectConfigContext.Provider value={value}>{children}</ProjectConfigContext.Provider>;
}

export function useProjectConfig() {
  const context = useContext(ProjectConfigContext);
  if (!context) {
    throw new Error("useProjectConfig must be used within ProjectConfigProvider.");
  }
  return context;
}
