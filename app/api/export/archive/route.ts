import { exportArchiveSchema } from "@/infrastructure/schemas";
import { createZipArchive, ZipArchiveEntry } from "@/infrastructure/zip-archive";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = exportArchiveSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid archive payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const archiveName = sanitizeArchiveName(parsed.data.archiveName);
  const entries = buildArchiveEntries(archiveName, parsed.data.files);
  const zipBuffer = createZipArchive(entries);

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archiveName}.zip"`,
      "Content-Length": String(zipBuffer.length)
    }
  });
}

function buildArchiveEntries(
  rootName: string,
  files: {
    contracts?: string;
    angularService?: string;
    angularServiceDependencies?: string;
    angularMockService?: string;
    jsonMocks?: string;
    componentBaseName?: string;
    componentTs?: string;
    componentHtml?: string;
    componentCss?: string;
    componentSpec?: string;
    editorBaseName?: string;
    editorTs?: string;
    editorHtml?: string;
    editorCss?: string;
    editorSpec?: string;
  }
): ZipArchiveEntry[] {
  const root = `${rootName}/`;
  const directories = [
    root,
    `${root}components/`,
    `${root}models/`,
    `${root}services/`,
    `${root}mocks/`
  ];

  const entries: ZipArchiveEntry[] = directories.map((path) => ({ path, directory: true }));
  const componentBaseName = sanitizeComponentBaseName(files.componentBaseName, "entity.component");
  const editorBaseName = sanitizeComponentBaseName(files.editorBaseName, "entity-editor.component");

  if (files.componentTs?.trim()) entries.push({ path: `${root}components/${componentBaseName}.ts`, content: files.componentTs });
  if (files.componentHtml?.trim()) entries.push({ path: `${root}components/${componentBaseName}.html`, content: files.componentHtml });
  if (files.componentCss?.trim()) entries.push({ path: `${root}components/${componentBaseName}.css`, content: files.componentCss });
  if (files.componentSpec?.trim()) entries.push({ path: `${root}components/${componentBaseName}.spec.ts`, content: files.componentSpec });
  if (files.editorTs?.trim()) entries.push({ path: `${root}components/${editorBaseName}.ts`, content: files.editorTs });
  if (files.editorHtml?.trim()) entries.push({ path: `${root}components/${editorBaseName}.html`, content: files.editorHtml });
  if (files.editorCss?.trim()) entries.push({ path: `${root}components/${editorBaseName}.css`, content: files.editorCss });
  if (files.editorSpec?.trim()) entries.push({ path: `${root}components/${editorBaseName}.spec.ts`, content: files.editorSpec });
  if (files.contracts?.trim()) entries.push({ path: `${root}models/contracts.ts`, content: files.contracts });
  if (files.angularService?.trim()) entries.push({ path: `${root}services/angular.service.ts`, content: files.angularService });
  if (files.angularServiceDependencies?.trim()) {
    entries.push({ path: `${root}services/service.dependencies.ts`, content: files.angularServiceDependencies });
  }
  if (files.angularMockService?.trim()) entries.push({ path: `${root}mocks/mock.service.ts`, content: files.angularMockService });
  if (files.jsonMocks?.trim()) entries.push({ path: `${root}mocks/data.mocks.json`, content: files.jsonMocks });

  return entries;
}

function sanitizeArchiveName(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || "contractflow-export";
}

function sanitizeComponentBaseName(value: string | undefined, fallback: string): string {
  const normalized = (value ?? fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallback;
}
