import { buildCompatibilityBanner } from "@/domain/angular-target";
import { splitTopLevel, toCamelCase, toKebabCase, toPascalCase } from "@/domain/naming";
import { AngularCrudComponentArtifacts, EngineConfig, ModelSpec, PropertySpec, UiFramework } from "@/domain/types";

interface CrudGenerationContext {
  config: EngineConfig;
  rootModel: ModelSpec;
  cleanName: string;
  modelType: string;
  serviceName: string;
  listComponentName: string;
  formComponentName: string;
  resourceKebab: string;
  listSelector: string;
  formSelector: string;
  idKey: string | null;
  fields: CrudField[];
}

interface CrudField {
  controlName: string;
  type: string;
  inputKind: "checkbox" | "date" | "password" | "text" | "number";
  nullable: boolean;
  optional: boolean;
  validators: string[];
  label: string;
}

interface TemplateStrategy {
  renderFormHtml: (context: CrudGenerationContext) => string;
  renderListHtml: (context: CrudGenerationContext) => string;
  renderFormStyles: (context: CrudGenerationContext) => string;
  renderListStyles: (context: CrudGenerationContext) => string;
  listImports: string[];
  formImports: string[];
}

const MATERIAL_IMPORTS: Record<string, string> = {
  MatButtonModule: "@angular/material/button",
  MatCheckboxModule: "@angular/material/checkbox",
  MatFormFieldModule: "@angular/material/form-field",
  MatInputModule: "@angular/material/input"
};

const TEMPLATE_STRATEGIES: Record<UiFramework, TemplateStrategy> = {
  none: {
    listImports: [],
    formImports: [],
    renderFormHtml: renderSemanticFormHtml,
    renderListHtml: renderSemanticListHtml,
    renderFormStyles: renderSemanticFormStyles,
    renderListStyles: renderSemanticListStyles
  },
  material: {
    listImports: ["MatButtonModule"],
    formImports: ["MatButtonModule", "MatCheckboxModule", "MatFormFieldModule", "MatInputModule"],
    renderFormHtml: renderMaterialFormHtml,
    renderListHtml: renderMaterialListHtml,
    renderFormStyles: renderMaterialFormStyles,
    renderListStyles: renderMaterialListStyles
  },
  tailwind: {
    listImports: [],
    formImports: [],
    renderFormHtml: renderTailwindFormHtml,
    renderListHtml: renderTailwindListHtml,
    renderFormStyles: renderTailwindFormStyles,
    renderListStyles: renderTailwindListStyles
  }
};

export function generateAngularComponents(models: ModelSpec[], config: EngineConfig): AngularCrudComponentArtifacts {
  if (models.length === 0) {
    return {
      listTs: "// No models available for component generation.",
      listHtml: "<!-- No models available for component generation. -->",
      formTs: "// No models available for component generation.",
      formHtml: "<!-- No models available for component generation. -->"
    };
  }

  const rootModel = models[0];
  const cleanName = rootModel.name.replace(/(Dto|Entity|Model)$/i, "") || rootModel.name;
  const resourceKebab = toKebabCase(cleanName || rootModel.name);
  const entityName = toPascalCase(cleanName || rootModel.name);
  const modelType = `${config.modelPrefix}${rootModel.name}`;
  const serviceName = `${entityName}${config.serviceSuffix}`;
  const formComponentName = `${entityName}FormComponent`;
  const listComponentName = `${entityName}ListComponent`;
  const listSelector = `cf-${resourceKebab}-list`;
  const formSelector = `cf-${resourceKebab}-form`;
  const idKey = findIdProperty(rootModel, config);
  const fields = rootModel.properties.map((property) => createCrudField(property, config));

  const context: CrudGenerationContext = {
    config,
    rootModel,
    cleanName,
    modelType,
    serviceName,
    listComponentName,
    formComponentName,
    resourceKebab,
    listSelector,
    formSelector,
    idKey,
    fields
  };

  return {
    listTs: renderListComponentTs(context),
    listHtml: TEMPLATE_STRATEGIES[config.uiFramework].renderListHtml(context),
    formTs: renderFormComponentTs(context),
    formHtml: TEMPLATE_STRATEGIES[config.uiFramework].renderFormHtml(context)
  };
}

function renderListComponentTs(context: CrudGenerationContext): string {
  const strategy = TEMPLATE_STRATEGIES[context.config.uiFramework];
  const materialImports = renderMaterialImports(strategy.listImports);
  const componentImports = ["CommonModule", context.formComponentName, ...strategy.listImports].join(", ");
  const styles = renderComponentStyles(strategy.renderListStyles(context));

  return [
    buildCompatibilityBanner(context.config.angularVersion, "component"),
    "import { CommonModule } from '@angular/common';",
    "import { Component, OnInit, inject } from '@angular/core';",
    ...materialImports,
    `import { ${context.serviceName} } from './${context.resourceKebab}.service';`,
    `import { ${context.formComponentName} } from './${context.resourceKebab}-form.component';`,
    `import type { ${context.modelType} } from './${context.resourceKebab}.contracts';`,
    "",
    "@Component({",
    `  selector: '${context.listSelector}',`,
    "  standalone: true,",
    `  imports: [${componentImports}],`,
    `  templateUrl: './${context.resourceKebab}-list.component.html',`,
    styles,
    "})",
    `export class ${context.listComponentName} implements OnInit {`,
    `  private readonly service = inject(${context.serviceName});`,
    "",
    `  items: ${context.modelType}[] = [];`,
    `  selectedItem: ${context.modelType} | null = null;`,
    "  isLoading = false;",
    "",
    "  ngOnInit(): void {",
    "    this.loadItems();",
    "  }",
    "",
    "  loadItems(): void {",
    "    this.isLoading = true;",
    "    this.service.list().subscribe({",
    "      next: (items) => {",
    "        this.items = items;",
    "        this.isLoading = false;",
    "      },",
    "      error: () => {",
    "        this.isLoading = false;",
    "      }",
    "    });",
    "  }",
    "",
    "  startCreate(): void {",
    "    this.selectedItem = null;",
    "  }",
    "",
    `  startEdit(item: ${context.modelType}): void {`,
    "    this.selectedItem = structuredClone(item);",
    "  }",
    "",
    "  handleSaved(): void {",
    "    this.selectedItem = null;",
    "    this.loadItems();",
    "  }",
    "",
    "  handleCanceled(): void {",
    "    this.selectedItem = null;",
    "  }",
    "",
    `  remove(item: ${context.modelType}): void {`,
    "    const id = this.resolveId(item);",
    "    if (!id) {",
    "      return;",
    "    }",
    "",
    "    this.service.delete(id).subscribe({",
    "      next: () => this.loadItems()",
    "    });",
    "  }",
    "",
    `  trackByItem = (index: number, item: ${context.modelType}): string | number => this.resolveId(item) || index;`,
    "",
    `  private resolveId(item: ${context.modelType}): string {`,
    `    return String((item as Record<string, unknown>)['${context.idKey ?? "id"}'] ?? '');`,
    "  }",
    "}"
  ]
    .filter(Boolean)
    .join("\n");
}

function renderFormComponentTs(context: CrudGenerationContext): string {
  const strategy = TEMPLATE_STRATEGIES[context.config.uiFramework];
  const materialImports = renderMaterialImports(strategy.formImports);
  const componentImports = ["CommonModule", "ReactiveFormsModule", ...strategy.formImports].join(", ");
  const styles = renderComponentStyles(strategy.renderFormStyles(context));
  const formControls = context.fields
    .map((field) => {
      const validators = field.validators.length ? `, [${field.validators.join(", ")}]` : "";
      return `    ${field.controlName}: [${renderEmptyValue(field)}${validators}]`;
    })
    .join(",\n");
  const resetLines = context.fields
    .map((field) => `      ${field.controlName}: value?.${field.controlName} ?? ${renderEmptyValue(field)}`)
    .join(",\n");
  const emptyLines = context.fields
    .map((field) => `      ${field.controlName}: ${renderEmptyValue(field)}`)
    .join(",\n");

  return [
    buildCompatibilityBanner(context.config.angularVersion, "component"),
    "import { CommonModule } from '@angular/common';",
    "import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';",
    "import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';",
    ...materialImports,
    `import { ${context.serviceName} } from './${context.resourceKebab}.service';`,
    `import type { ${context.modelType} } from './${context.resourceKebab}.contracts';`,
    "",
    "@Component({",
    `  selector: '${context.formSelector}',`,
    "  standalone: true,",
    `  imports: [${componentImports}],`,
    `  templateUrl: './${context.resourceKebab}-form.component.html',`,
    styles,
    "})",
    `export class ${context.formComponentName} implements OnChanges {`,
    "  private readonly fb = inject(FormBuilder);",
    `  private readonly service = inject(${context.serviceName});`,
    "",
    `  @Input() value: ${context.modelType} | null = null;`,
    `  @Output() saved = new EventEmitter<${context.modelType}>();`,
    "  @Output() canceled = new EventEmitter<void>();",
    "",
    "  readonly form = this.fb.group({",
    formControls,
    "  });",
    "",
    "  ngOnChanges(): void {",
    "    this.resetForm(this.value);",
    "  }",
    "",
    "  submit(): void {",
    "    if (this.form.invalid) {",
    "      this.form.markAllAsTouched();",
    "      return;",
    "    }",
    "",
    `    const payload = this.form.getRawValue() as ${context.modelType};`,
    "    const id = this.resolveId(payload);",
    "    const request = this.value && id ? this.service.update(id, payload) : this.service.create(payload);",
    "",
    "    request.subscribe({",
    "      next: (item) => {",
    "        this.saved.emit(item);",
    "        this.resetForm();",
    "      }",
    "    });",
    "  }",
    "",
    "  cancel(): void {",
    "    this.resetForm();",
    "    this.canceled.emit();",
    "  }",
    "",
    `  private resetForm(value: ${context.modelType} | null = null): void {`,
    "    this.form.reset({",
    resetLines,
    "    });",
    "  }",
    "",
    `  createEmptyValue(): ${context.modelType} {`,
    "    return {",
    emptyLines,
    `    } as ${context.modelType};`,
    "  }",
    "",
    `  private resolveId(item: ${context.modelType}): string {`,
    `    return String((item as Record<string, unknown>)['${context.idKey ?? "id"}'] ?? '');`,
    "  }",
    "}"
  ]
    .filter(Boolean)
    .join("\n");
}

function createCrudField(property: PropertySpec, config: EngineConfig): CrudField {
  const controlName = config.camelCaseProperties ? toCamelCase(property.name) : property.name;
  const normalizedType = normalizeType(property.type);
  const inputKind = inferInputKind(controlName, normalizedType);
  const validators = inferValidators(controlName, normalizedType, property);

  return {
    controlName,
    type: normalizedType,
    inputKind,
    nullable: property.nullable,
    optional: property.optional,
    validators,
    label: toPascalCase(controlName).replace(/([a-z])([A-Z])/g, "$1 $2")
  };
}

function inferInputKind(controlName: string, type: string): CrudField["inputKind"] {
  const normalized = controlName.toLowerCase();
  if (type === "boolean") return "checkbox";
  if (type === "Date" || normalized.endsWith("date") || normalized.endsWith("at")) return "date";
  if (type === "number") return "number";
  if (normalized.includes("password")) return "password";
  return "text";
}

function inferValidators(controlName: string, type: string, property: PropertySpec): string[] {
  const validators: string[] = [];
  const normalized = controlName.toLowerCase();

  if (!property.nullable && !property.optional && type !== "boolean") {
    validators.push("Validators.required");
  }
  if (normalized.includes("email")) {
    validators.push("Validators.email");
  }
  if (normalized.includes("password")) {
    validators.push("Validators.minLength(8)");
  }

  return validators;
}

function normalizeType(type: string): string {
  return splitTopLevel(type, "|")
    .map((part) => part.trim())
    .filter((part) => part && part !== "null" && part !== "undefined")[0] ?? type;
}

function renderEmptyValue(field: CrudField): string {
  switch (field.inputKind) {
    case "checkbox":
      return "false";
    case "number":
      return field.nullable || field.optional ? "null" : "0";
    case "date":
      return "''";
    default:
      return "''";
  }
}

function renderSemanticListHtml(context: CrudGenerationContext): string {
  const headers = context.fields.map((field) => `          <th scope="col">${field.label}</th>`).join("\n");
  const cells = context.fields.map((field) => `          <td>{{ item.${field.controlName} }}</td>`).join("\n");

  return [
    `<section class="crud-list-shell">`,
    `  <header class="crud-list-header">`,
    `    <div>`,
    `      <h2>${toPascalCase(context.cleanName)} List</h2>`,
    `      <p>Generated CRUD list wired to ${context.serviceName}.</p>`,
    `    </div>`,
    `    <button type="button" (click)="startCreate()">New ${toPascalCase(context.cleanName)}</button>`,
    `  </header>`,
    ``,
    `  <table>`,
    `    <thead>`,
    `      <tr>`,
    headers,
    `        <th scope="col">Actions</th>`,
    `      </tr>`,
    `    </thead>`,
    `    <tbody>`,
    `      @for (item of items; track trackByItem($index, item)) {`,
    `        <tr>`,
    cells,
    `          <td>`,
    `            <button type="button" (click)="startEdit(item)">Edit</button>`,
    `            <button type="button" (click)="remove(item)">Delete</button>`,
    `          </td>`,
    `        </tr>`,
    `      } @empty {`,
    `        <tr>`,
    `          <td class="crud-empty-state" colspan="${context.fields.length + 1}">No records generated yet.</td>`,
    `        </tr>`,
    `      }`,
    `    </tbody>`,
    `  </table>`,
    ``,
    `  <${context.formSelector} [value]="selectedItem" (saved)="handleSaved()" (canceled)="handleCanceled()"></${context.formSelector}>`,
    `</section>`
  ].join("\n");
}

function renderMaterialListHtml(context: CrudGenerationContext): string {
  const headers = context.fields.map((field) => `          <th scope="col">${field.label}</th>`).join("\n");
  const cells = context.fields.map((field) => `          <td>{{ item.${field.controlName} }}</td>`).join("\n");

  return [
    `<section class="crud-list-shell material-shell">`,
    `  <header class="crud-list-header">`,
    `    <div>`,
    `      <h2>${toPascalCase(context.cleanName)} List</h2>`,
    `      <p>Generated CRUD list wired to ${context.serviceName}.</p>`,
    `    </div>`,
    `    <button mat-flat-button color="primary" type="button" (click)="startCreate()">New ${toPascalCase(context.cleanName)}</button>`,
    `  </header>`,
    ``,
    `  <div class="table-shell">`,
    `    <table>`,
    `      <thead>`,
    `        <tr>`,
    headers,
    `          <th scope="col">Actions</th>`,
    `        </tr>`,
    `      </thead>`,
    `      <tbody>`,
    `        @for (item of items; track trackByItem($index, item)) {`,
    `          <tr>`,
    cells,
    `            <td class="actions-cell">`,
    `              <button mat-stroked-button type="button" (click)="startEdit(item)">Edit</button>`,
    `              <button mat-stroked-button type="button" (click)="remove(item)">Delete</button>`,
    `            </td>`,
    `          </tr>`,
    `        } @empty {`,
    `          <tr>`,
    `            <td class="crud-empty-state" colspan="${context.fields.length + 1}">No records generated yet.</td>`,
    `          </tr>`,
    `        }`,
    `      </tbody>`,
    `    </table>`,
    `  </div>`,
    ``,
    `  <${context.formSelector} [value]="selectedItem" (saved)="handleSaved()" (canceled)="handleCanceled()"></${context.formSelector}>`,
    `</section>`
  ].join("\n");
}

function renderTailwindListHtml(context: CrudGenerationContext): string {
  const headers = context.fields
    .map((field) => `            <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">${field.label}</th>`)
    .join("\n");
  const cells = context.fields
    .map((field) => `            <td class="px-4 py-3 text-sm text-slate-200">{{ item.${field.controlName} }}</td>`)
    .join("\n");

  return [
    `<section class="flex h-full flex-col gap-4 bg-slate-950/60 p-4">`,
    `  <header class="flex items-center justify-between gap-4">`,
    `    <div>`,
    `      <h2 class="text-lg font-semibold text-slate-100">${toPascalCase(context.cleanName)} List</h2>`,
    `      <p class="text-sm text-slate-400">Generated CRUD list wired to ${context.serviceName}.</p>`,
    `    </div>`,
    `    <button type="button" class="rounded-md bg-cyan-400 px-4 py-2 font-medium text-slate-950" (click)="startCreate()">New ${toPascalCase(context.cleanName)}</button>`,
    `  </header>`,
    ``,
    `  <div class="overflow-hidden rounded-xl border border-slate-800">`,
    `    <table class="min-w-full divide-y divide-slate-800 bg-slate-950/70">`,
    `      <thead class="bg-slate-900/80">`,
    `        <tr>`,
    headers,
    `          <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>`,
    `        </tr>`,
    `      </thead>`,
    `      <tbody class="divide-y divide-slate-800">`,
    `        @for (item of items; track trackByItem($index, item)) {`,
    `          <tr>`,
    cells,
    `            <td class="px-4 py-3">`,
    `              <div class="flex gap-2">`,
    `                <button type="button" class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200" (click)="startEdit(item)">Edit</button>`,
    `                <button type="button" class="rounded-md border border-rose-500/40 px-3 py-1.5 text-sm text-rose-200" (click)="remove(item)">Delete</button>`,
    `              </div>`,
    `            </td>`,
    `          </tr>`,
    `        } @empty {`,
    `          <tr>`,
    `            <td class="px-4 py-8 text-center text-sm text-slate-500" colspan="${context.fields.length + 1}">No records generated yet.</td>`,
    `          </tr>`,
    `        }`,
    `      </tbody>`,
    `    </table>`,
    `  </div>`,
    ``,
    `  <${context.formSelector} [value]="selectedItem" (saved)="handleSaved()" (canceled)="handleCanceled()"></${context.formSelector}>`,
    `</section>`
  ].join("\n");
}

function renderSemanticFormHtml(context: CrudGenerationContext): string {
  const fields = context.fields.map((field) => renderSemanticField(field)).join("\n\n");
  return [
    `<form [formGroup]="form" (ngSubmit)="submit()" class="crud-form-shell">`,
    `  <fieldset>`,
    `    <legend>${toPascalCase(context.cleanName)} Form</legend>`,
    `    <div class="crud-form-grid">`,
    fields,
    `    </div>`,
    `    <div class="crud-form-actions">`,
    `      <button type="submit">Save</button>`,
    `      <button type="button" (click)="cancel()">Cancel</button>`,
    `    </div>`,
    `  </fieldset>`,
    `</form>`
  ].join("\n");
}

function renderTailwindFormHtml(context: CrudGenerationContext): string {
  const fields = context.fields.map((field) => renderTailwindField(field)).join("\n\n");
  return [
    `<form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">`,
    `  <div>`,
    `    <h3 class="text-lg font-semibold text-slate-100">${toPascalCase(context.cleanName)} Form</h3>`,
    `    <p class="text-sm text-slate-400">Create or update ${context.cleanName.toLowerCase()} records using reactive forms.</p>`,
    `  </div>`,
    `  <div class="grid gap-4 md:grid-cols-2">`,
    fields,
    `  </div>`,
    `  <div class="flex gap-3">`,
    `    <button type="submit" class="rounded-md bg-cyan-400 px-4 py-2 font-medium text-slate-950">Save</button>`,
    `    <button type="button" class="rounded-md border border-slate-700 px-4 py-2 text-slate-200" (click)="cancel()">Cancel</button>`,
    `  </div>`,
    `</form>`
  ].join("\n");
}

function renderMaterialFormHtml(context: CrudGenerationContext): string {
  const fields = context.fields.map((field) => renderMaterialField(field)).join("\n\n");
  return [
    `<form [formGroup]="form" (ngSubmit)="submit()" class="material-form-shell">`,
    `  <div class="material-form-header">`,
    `    <h3>${toPascalCase(context.cleanName)} Form</h3>`,
    `    <p>Material-ready CRUD form with reactive controls.</p>`,
    `  </div>`,
    `  <div class="material-form-grid">`,
    fields,
    `  </div>`,
    `  <div class="material-form-actions">`,
    `    <button mat-flat-button color="primary" type="submit">Save</button>`,
    `    <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>`,
    `  </div>`,
    `</form>`
  ].join("\n");
}

function renderSemanticField(field: CrudField): string {
  if (field.inputKind === "checkbox") {
    return [
      `      <label class="crud-checkbox-field">`,
      `        <input type="checkbox" formControlName="${field.controlName}" />`,
      `        <span>${field.label}</span>`,
      `      </label>`
    ].join("\n");
  }

  return [
    `      <label class="crud-input-field">`,
    `        <span>${field.label}</span>`,
    `        <input type="${field.inputKind}" formControlName="${field.controlName}" />`,
    `      </label>`
  ].join("\n");
}

function renderTailwindField(field: CrudField): string {
  if (field.inputKind === "checkbox") {
    return [
      `    <label class="flex items-center gap-3 rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-200">`,
      `      <input type="checkbox" formControlName="${field.controlName}" class="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400" />`,
      `      <span>${field.label}</span>`,
      `    </label>`
    ].join("\n");
  }

  return [
    `    <label class="text-sm text-slate-300">`,
    `      <span class="mb-1 block text-xs uppercase tracking-wide text-slate-500">${field.label}</span>`,
    `      <input type="${field.inputKind}" formControlName="${field.controlName}" class="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400" />`,
    `    </label>`
  ].join("\n");
}

function renderMaterialField(field: CrudField): string {
  if (field.inputKind === "checkbox") {
    return `    <mat-checkbox formControlName="${field.controlName}">${field.label}</mat-checkbox>`;
  }

  return [
    `    <mat-form-field appearance="outline">`,
    `      <mat-label>${field.label}</mat-label>`,
    `      <input matInput type="${field.inputKind}" formControlName="${field.controlName}" />`,
    `    </mat-form-field>`
  ].join("\n");
}

function renderSemanticListStyles(): string {
  return [
    `:host {`,
    `  display: block;`,
    `}`,
    ``,
    `.crud-list-shell {`,
    `  display: grid;`,
    `  gap: 1.5rem;`,
    `}`,
    ``,
    `.crud-list-header {`,
    `  display: flex;`,
    `  align-items: center;`,
    `  justify-content: space-between;`,
    `  gap: 1rem;`,
    `}`,
    ``,
    `.crud-list-header h2 {`,
    `  margin: 0;`,
    `  font-size: 1.25rem;`,
    `}`,
    ``,
    `.crud-list-header p {`,
    `  margin: 0.35rem 0 0;`,
    `  color: #475569;`,
    `}`,
    ``,
    `table {`,
    `  width: 100%;`,
    `  border-collapse: collapse;`,
    `  overflow: hidden;`,
    `  border: 1px solid #dbe3ee;`,
    `  border-radius: 0.9rem;`,
    `  background: #ffffff;`,
    `}`,
    ``,
    `th,`,
    `td {`,
    `  padding: 0.9rem 1rem;`,
    `  border-bottom: 1px solid #e2e8f0;`,
    `  text-align: left;`,
    `  vertical-align: middle;`,
    `}`,
    ``,
    `thead {`,
    `  background: #f8fafc;`,
    `}`,
    ``,
    `.crud-empty-state {`,
    `  text-align: center;`,
    `  color: #64748b;`,
    `}`,
    ``,
    `button {`,
    `  border: 1px solid #cbd5e1;`,
    `  border-radius: 0.7rem;`,
    `  background: #ffffff;`,
    `  padding: 0.65rem 1rem;`,
    `  font: inherit;`,
    `  cursor: pointer;`,
    `}`,
    ``,
    `td button + button {`,
    `  margin-left: 0.5rem;`,
    `}`
  ].join("\n");
}

function renderSemanticFormStyles(): string {
  return [
    `:host {`,
    `  display: block;`,
    `}`,
    ``,
    `.crud-form-shell fieldset {`,
    `  margin: 0;`,
    `  padding: 1.5rem;`,
    `  border: 1px solid #dbe3ee;`,
    `  border-radius: 1rem;`,
    `  display: grid;`,
    `  gap: 1.25rem;`,
    `  background: #ffffff;`,
    `}`,
    ``,
    `.crud-form-shell legend {`,
    `  padding: 0 0.35rem;`,
    `  font-weight: 700;`,
    `}`,
    ``,
    `.crud-form-grid {`,
    `  display: grid;`,
    `  gap: 1rem;`,
    `  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));`,
    `}`,
    ``,
    `.crud-input-field,`,
    `.crud-checkbox-field {`,
    `  display: grid;`,
    `  gap: 0.5rem;`,
    `}`,
    ``,
    `.crud-input-field input {`,
    `  width: 100%;`,
    `  border: 1px solid #cbd5e1;`,
    `  border-radius: 0.75rem;`,
    `  padding: 0.75rem 0.9rem;`,
    `  font: inherit;`,
    `}`,
    ``,
    `.crud-checkbox-field {`,
    `  align-items: center;`,
    `  grid-auto-flow: column;`,
    `  justify-content: start;`,
    `}`,
    ``,
    `.crud-form-actions {`,
    `  display: flex;`,
    `  gap: 0.75rem;`,
    `}`,
    ``,
    `.crud-form-actions button {`,
    `  border: 1px solid #cbd5e1;`,
    `  border-radius: 0.75rem;`,
    `  background: #ffffff;`,
    `  padding: 0.75rem 1rem;`,
    `  font: inherit;`,
    `  cursor: pointer;`,
    `}`
  ].join("\n");
}

function renderMaterialListStyles(): string {
  return [
    `:host {`,
    `  display: block;`,
    `}`,
    ``,
    `.material-shell {`,
    `  display: grid;`,
    `  gap: 1.5rem;`,
    `}`,
    ``,
    `.crud-list-header {`,
    `  display: flex;`,
    `  align-items: center;`,
    `  justify-content: space-between;`,
    `  gap: 1rem;`,
    `}`,
    ``,
    `.table-shell {`,
    `  overflow: hidden;`,
    `  border-radius: 1rem;`,
    `  border: 1px solid rgba(100, 116, 139, 0.18);`,
    `}`,
    ``,
    `table {`,
    `  width: 100%;`,
    `  border-collapse: collapse;`,
    `}`,
    ``,
    `th,`,
    `td {`,
    `  padding: 0.9rem 1rem;`,
    `  border-bottom: 1px solid rgba(100, 116, 139, 0.16);`,
    `  text-align: left;`,
    `}`,
    ``,
    `.actions-cell {`,
    `  display: flex;`,
    `  gap: 0.75rem;`,
    `}`,
    ``,
    `.crud-empty-state {`,
    `  text-align: center;`,
    `  opacity: 0.7;`,
    `}`
  ].join("\n");
}

function renderMaterialFormStyles(): string {
  return [
    `:host {`,
    `  display: block;`,
    `}`,
    ``,
    `.material-form-shell {`,
    `  display: grid;`,
    `  gap: 1.25rem;`,
    `  padding: 1.5rem;`,
    `  border-radius: 1rem;`,
    `  border: 1px solid rgba(100, 116, 139, 0.18);`,
    `}`,
    ``,
    `.material-form-header h3,`,
    `.material-form-header p {`,
    `  margin: 0;`,
    `}`,
    ``,
    `.material-form-grid {`,
    `  display: grid;`,
    `  gap: 1rem;`,
    `  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));`,
    `}`,
    ``,
    `.material-form-grid mat-form-field {`,
    `  width: 100%;`,
    `}`,
    ``,
    `.material-form-actions {`,
    `  display: flex;`,
    `  gap: 0.75rem;`,
    `}`
  ].join("\n");
}

function renderTailwindListStyles(): string {
  return [
    `:host {`,
    `  display: block;`,
    `}`
  ].join("\n");
}

function renderTailwindFormStyles(): string {
  return [
    `:host {`,
    `  display: block;`,
    `}`
  ].join("\n");
}

function renderComponentStyles(styles: string): string {
  const body = styles
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");

  return `  styles: [\`\n${body}\n  \`]`;
}

function findIdProperty(model: ModelSpec, config: EngineConfig): string | null {
  const property = model.properties.find((item) => /(^id$|id$|_id$)/i.test(item.name));
  if (!property) return null;
  return config.camelCaseProperties ? toCamelCase(property.name) : property.name;
}

function renderMaterialImports(modules: string[]): string[] {
  return Array.from(new Set(modules)).map((moduleName) => `import { ${moduleName} } from '${MATERIAL_IMPORTS[moduleName]}';`);
}


