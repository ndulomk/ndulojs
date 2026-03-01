# ndulojs-cli

CLI for [NduloJS](https://www.npmjs.com/package/ndulojs) — scaffold modules, submodules, and full projects in seconds.

---

## Install

```bash
# Use directly with npx (no install needed)
npx ndulojs-cli create my-app

# Or install globally for the ndulo command
npm install -g ndulojs-cli
```

---

## Commands

### `ndulojs-cli create`

Scaffolds a new project with the full NduloJS structure.

```bash
npx ndulojs-cli create <name>
```

**Generated structure:**

```
<name>/
├── src/
│   ├── modules/
│   └── index.ts
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

**Next steps:**

```bash
cd <name>
bun install
cp .env.example .env
bun dev
```

---

### `ndulo generate module`

Generates the full Clean Architecture structure for a module.

```bash
ndulo generate module <name>
```

**Example:**

```bash
ndulo generate module farms
```

**Generated files:**

```
src/modules/farms/
├── events/
│   └── farm.events.ts
├── application/
│   ├── dtos/farm.dto.ts
│   ├── ports/farm.port.ts
│   └── services/farm.service.ts
├── infrastructure/
│   ├── persistence/farm.repository.ts
│   └── http/controllers/farm.controller.ts
└── farm.module.ts
```

The `farm.module.ts` wires the DI immediately — register it in `src/index.ts` and the module is live.

**Submodule:**

```bash
ndulo generate module farms --sub members
```

Generates the same structure nested under `src/modules/farms/members/`. Does not overwrite the parent module.

---

### `ndulo add`

Adds a single file to an existing module.

```bash
ndulo add <type> <module>
```

**Available types:**

| Type | Generated file |
|---|---|
| `controller` | `infrastructure/http/controllers/{name}.controller.ts` |
| `service` | `application/services/{name}.service.ts` |
| `repository` | `infrastructure/persistence/{name}.repository.ts` |
| `dto` | `application/dtos/{name}.dto.ts` |
| `port` | `application/ports/{name}.port.ts` |
| `events` | `events/{name}.events.ts` |

**Example:**

```bash
ndulo add controller farms
ndulo add service farms
```

---

## Name conventions

The CLI accepts any case — it normalises automatically.

| Input | Singular | Files |
|---|---|---|
| `farms` | `farm` | `farm.service.ts` |
| `farmMembers` | `farmMember` | `farm-member.service.ts` |
| `crop-cycles` | `cropCycle` | `crop-cycle.service.ts` |
| `activities` | `activity` | `activity.service.ts` |

---

## Overwrite protection

If a module or file already exists, the CLI asks before overwriting:

```
Module "farms" already exists. Overwrite? (y/N)
```

---

## License

MIT