# ContractFlow

ContractFlow is a Next.js application that converts C# classes or JSON into TypeScript contracts, generates Angular service stubs, and produces offline JSON mocks.

## Features

- Intelligent transpiler for:
  - Nullable C# types (`string?`, `DateTime?`, `Nullable<T>`)
  - Lists and arrays (`List<T>`, `IEnumerable<T>`, `T[]`)
  - Date mapping (`DateTime`, `DateTimeOffset`, `DateOnly` -> `string` or `Date`)
- Configurable TypeScript output: `interface`, `type`, or `class`
- Angular service generation:
  - `inject()` style or constructor injection
  - Optional Signals state (`items`, `loading`, `loadAll()`)
  - HTTP method stubs: `list`, `getById`, `create`, `update`, `delete`
- JSON mock generation for offline development
- UI for paste/upload and convention toggles:
  - Prefix naming (e.g. `IUserDto`)
  - Injection style
  - API URL patterns (`/api/{resource}`)
  - Date mapping, output kind, camelCase and nullable policy

## REST Endpoints

- `POST /api/engine/convert`
  - Input: `{ sourceType, input, rootModelName?, config? }`
  - Output: `{ models, typescript }`
- `POST /api/engine/angular-service`
  - Input: `{ models, config? }`
  - Output: `{ service }`
- `POST /api/engine/mock`
  - Input: `{ models, config? }`
  - Output: `{ mocks }`
- `POST /api/engine/all`
  - Input: `{ sourceType, input, rootModelName?, config? }`
  - Output: `{ models, typescript, angularService, jsonMocks, config }`

## Run

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

Includes:
- Unit tests for C# rules, JSON rules, and Angular generator options
- Integration tests for `/api/engine/convert` and `/api/engine/all`

## Example Inputs/Outputs

See `examples/`:
- `csharp-input.cs`
- `json-input.json`
- `output-typescript.ts`
- `output-angular.service.ts`
- `output-mocks.json`
