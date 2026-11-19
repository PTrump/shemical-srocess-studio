# Third-Party License Inventory

This document is a factual inventory of the dependencies locked by the project. It is not legal advice, and it does not replace the license files shipped inside each dependency.

## Audit scope and method

- Source of dependency tree: `package-lock.json` (lockfileVersion 3).
- Locked non-root entries: **145**.
- Installed entries in the Windows x64 environment: **77**.
- Optional platform-specific entries not installed on this platform: **68**.
- License data was read from each installed package's `package.json` and its top-level `LICENSE`/`LICENCE`/`COPYING`/`NOTICE` files.
- Optional packages that were not installed are marked NOT VERIFIED; their lockfile entries were not used to infer a license.

## Project vs third-party licensing

The project itself is licensed under the **MIT License**, `Copyright (c) 2026 Lei Meng`. See [LICENSE](../LICENSE).

The project MIT License does **not** replace, modify or extend the licenses of any third-party package. Each package remains under its own license and copyright, and its license/NOTICE obligations must be preserved.

## Summary

- Installed packages reviewed: **77**.
- Direct dependencies: **14**.
- License counts: **MIT: 53, Apache-2.0: 5, ISC: 11, BSD-3-Clause: 3, 0BSD: 3, MPL-2.0: 2**.
- Licenses requiring explicit review: **MPL-2.0** (`lightningcss`, `lightningcss-win32-x64-msvc`) and packages with no top-level license file (listed below).
- No installed package declares GPL, AGPL, SSPL, UNLICENSED, BUSL or an unknown license in its package metadata.
- `echarts`, `typescript` and `@typescript/typescript-win32-x64` include `NOTICE` files. Preserve those notices if redistributing.

## Installed package inventory

| Package | Version | License | License file | NOTICE | Scope | Retention / result |
|---|---:|---|---|---|---|---|
| `@jridgewell/resolve-uri` | 3.1.3 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@jridgewell/sourcemap-codec` | 1.6.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@jridgewell/trace-mapping` | 0.3.31 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@oxc-project/types` | 0.156.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@oxlint/binding-win32-x64-msvc` | 1.94.0 | MIT | — | — | transitive | No package license file; metadata only — NEEDS REVIEW |
| `@rolldown/binding-win32-x64-msvc` | 1.2.19 | MIT | — | — | transitive | No package license file; metadata only — NEEDS REVIEW |
| `@rolldown/pluginutils` | 1.1.1 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/chai` | 5.2.3 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/d3-color` | 3.1.3 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/d3-drag` | 3.0.7 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/d3-interpolate` | 3.0.4 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/d3-selection` | 3.0.12 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/d3-transition` | 3.0.9 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/d3-zoom` | 3.0.9 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/deep-eql` | 4.0.2 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/estree` | 1.0.10 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@types/node` | 24.19.2 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `@types/react` | 19.3.0 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `@types/react-dom` | 19.3.0 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `@typescript/typescript-win32-x64` | 7.0.2 | Apache-2.0 | LICENSE | NOTICE.txt | transitive | Preserve LICENSE, NOTICE and notices — PASS |
| `@vitejs/plugin-react` | 6.3.0 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `@vitest/mocker` | 5.1.1 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@vitest/spy` | 5.1.1 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `@xyflow/react` | 13.0.2 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `@xyflow/system` | 1.0.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `assertion-error` | 2.0.1 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `chai` | 6.3.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `classcat` | 5.0.5 | MIT | LICENSE.md | — | transitive | Preserve copyright/license notice — PASS |
| `csstype` | 3.2.4 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-color` | 3.1.1 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-dispatch` | 3.0.2 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-drag` | 3.0.1 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-ease` | 3.0.2 | BSD-3-Clause | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-interpolate` | 3.0.2 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-selection` | 3.0.1 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-timer` | 3.0.2 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-transition` | 3.0.2 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `d3-zoom` | 3.0.1 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `detect-libc` | 2.1.2 | Apache-2.0 | LICENSE | — | transitive | Preserve LICENSE, NOTICE and notices — PASS |
| `echarts` | 6.1.0 | Apache-2.0 | LICENSE, licenses | NOTICE | direct | Preserve LICENSE, NOTICE and notices — PASS |
| `echarts > tslib` | 2.3.0 | 0BSD | CopyrightNotice.txt, LICENSE.txt | — | transitive | Preserve copyright/license notice — PASS |
| `echarts-for-react` | 3.1.0 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `es-module-lexer` | 2.3.2 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `estree-walker` | 3.0.3 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `expect-type` | 1.4.0 | Apache-2.0 | LICENSE | — | transitive | Preserve LICENSE, NOTICE and notices — PASS |
| `fast-deep-equal` | 3.1.3 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `fdir` | 6.5.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `lightningcss` | 1.33.0 | MPL-2.0 | LICENSE | — | transitive | Preserve license/notices; review MPL obligations — NEEDS REVIEW |
| `lightningcss-win32-x64-msvc` | 1.33.0 | MPL-2.0 | LICENSE | — | transitive | Preserve license/notices; review MPL obligations — NEEDS REVIEW |
| `lucide-react` | 1.75.0 | ISC | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `magic-string` | 1.4.5 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `nanoid` | 3.3.20 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `obug` | 3.0.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `oxlint` | 1.94.0 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `picocolors` | 1.1.1 | ISC | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `picomatch` | 4.0.7 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `postcss` | 8.5.33 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `react` | 19.3.1 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `react-compiler-runtime` | 1.0.0 | MIT | — | — | transitive | No package license file; metadata only — NEEDS REVIEW |
| `react-dom` | 19.3.1 | MIT | LICENSE | — | direct | Preserve copyright/license notice — PASS |
| `rolldown` | 1.2.19 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `scheduler` | 0.28.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `size-sensor` | 1.0.3 | ISC | — | — | transitive | No package license file; metadata only — NEEDS REVIEW |
| `source-map-js` | 1.2.3 | BSD-3-Clause | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `std-env` | 4.3.0 | MIT | LICENCE | — | transitive | Preserve copyright/license notice — PASS |
| `tinybench` | 6.2.4 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `tinyexec` | 1.3.1 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `tinyglobby` | 0.2.17 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `tslib` | 2.9.1 | 0BSD | CopyrightNotice.txt, LICENSE.txt | — | transitive | Preserve copyright/license notice — PASS |
| `typescript` | 7.0.2 | Apache-2.0 | LICENSE | NOTICE.txt | direct | Preserve LICENSE, NOTICE and notices — PASS |
| `undici-types` | 7.24.6 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `vite` | 8.3.8 | MIT | LICENSE.md | — | direct | Preserve copyright/license notice — PASS |
| `vitest` | 5.1.1 | MIT | LICENSE.md | — | direct | Preserve copyright/license notice — PASS |
| `why-is-node-running` | 3.2.1 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `zrender` | 6.1.0 | BSD-3-Clause | LICENSE | — | transitive | Preserve copyright/license notice — PASS |
| `zrender > tslib` | 2.3.0 | 0BSD | CopyrightNotice.txt, LICENSE.txt | — | transitive | Preserve copyright/license notice — PASS |
| `zustand` | 5.1.0 | MIT | LICENSE | — | transitive | Preserve copyright/license notice — PASS |

## Installed packages needing review

### MPL-2.0

- `lightningcss@1.33.0` — MPL-2.0 license file exists; used as a Vite dependency. Review MPL source/notice obligations before redistribution.
- `lightningcss-win32-x64-msvc@1.33.0` — MPL-2.0 license file exists; Windows native binary package. Review MPL obligations.

These are marked **NEEDS REVIEW**, not automatically rejected or removed.

### Installed packages with no top-level license file

- `@oxlint/binding-win32-x64-msvc@1.94.0` — metadata declares **MIT**, but no top-level LICENSE/LICENCE/COPYING file was found in the installed package. **NEEDS REVIEW**.
- `@rolldown/binding-win32-x64-msvc@1.2.19` — metadata declares **MIT**, but no top-level LICENSE/LICENCE/COPYING file was found in the installed package. **NEEDS REVIEW**.
- `react-compiler-runtime@1.0.0` — metadata declares **MIT**, but no top-level LICENSE/LICENCE/COPYING file was found in the installed package. **NEEDS REVIEW**.
- `size-sensor@1.0.3` — metadata declares **ISC**, but no top-level LICENSE/LICENCE/COPYING file was found in the installed package. **NEEDS REVIEW**.

## Optional lockfile entries not installed

The following packages are present in the lockfile as optional platform-specific entries but were not installed on this Windows x64 environment. Their license files and metadata could not be verified from installed files. They are **NOT VERIFIED** here and are not part of the current runtime installation.

```text
@emnapi/core@2.0.0-beta.2
@emnapi/runtime@2.0.0-beta.2
@emnapi/wasi-threads@2.2.0
@napi-rs/wasm-runtime@1.2.6
@oxlint/binding-android-arm-eabi@1.94.0
@oxlint/binding-android-arm64@1.94.0
@oxlint/binding-darwin-arm64@1.94.0
@oxlint/binding-darwin-x64@1.94.0
@oxlint/binding-freebsd-x64@1.94.0
@oxlint/binding-linux-arm-gnueabihf@1.94.0
@oxlint/binding-linux-arm-musleabihf@1.94.0
@oxlint/binding-linux-arm64-gnu@1.94.0
@oxlint/binding-linux-arm64-musl@1.94.0
@oxlint/binding-linux-ppc64-gnu@1.94.0
@oxlint/binding-linux-riscv64-gnu@1.94.0
@oxlint/binding-linux-riscv64-musl@1.94.0
@oxlint/binding-linux-s390x-gnu@1.94.0
@oxlint/binding-linux-x64-gnu@1.94.0
@oxlint/binding-linux-x64-musl@1.94.0
@oxlint/binding-openharmony-arm64@1.94.0
@oxlint/binding-win32-arm64-msvc@1.94.0
@oxlint/binding-win32-ia32-msvc@1.94.0
@rolldown/binding-android-arm-eabi@1.2.19
@rolldown/binding-android-arm64@1.2.19
@rolldown/binding-darwin-arm64@1.2.19
@rolldown/binding-darwin-x64@1.2.19
@rolldown/binding-freebsd-x64@1.2.19
@rolldown/binding-linux-arm-gnueabihf@1.2.19
@rolldown/binding-linux-arm64-gnu@1.2.19
@rolldown/binding-linux-arm64-musl@1.2.19
@rolldown/binding-linux-ppc64-gnu@1.2.19
@rolldown/binding-linux-s390x-gnu@1.2.19
@rolldown/binding-linux-x64-gnu@1.2.19
@rolldown/binding-linux-x64-musl@1.2.19
@rolldown/binding-openharmony-arm64@1.2.19
@rolldown/binding-wasm32-wasi@1.2.19
@rolldown/binding-win32-arm64-msvc@1.2.19
@tybys/wasm-util@0.10.5
@typescript/typescript-aix-ppc64@7.0.2
@typescript/typescript-darwin-arm64@7.0.2
@typescript/typescript-darwin-x64@7.0.2
@typescript/typescript-freebsd-arm64@7.0.2
@typescript/typescript-freebsd-x64@7.0.2
@typescript/typescript-linux-arm@7.0.2
@typescript/typescript-linux-arm64@7.0.2
@typescript/typescript-linux-loong64@7.0.2
@typescript/typescript-linux-mips64el@7.0.2
@typescript/typescript-linux-ppc64@7.0.2
@typescript/typescript-linux-riscv64@7.0.2
@typescript/typescript-linux-s390x@7.0.2
@typescript/typescript-linux-x64@7.0.2
@typescript/typescript-netbsd-arm64@7.0.2
@typescript/typescript-netbsd-x64@7.0.2
@typescript/typescript-openbsd-arm64@7.0.2
@typescript/typescript-openbsd-x64@7.0.2
@typescript/typescript-sunos-x64@7.0.2
@typescript/typescript-win32-arm64@7.0.2
fsevents@2.3.3
lightningcss-android-arm64@1.33.0
lightningcss-darwin-arm64@1.33.0
lightningcss-darwin-x64@1.33.0
lightningcss-freebsd-x64@1.33.0
lightningcss-linux-arm-gnueabihf@1.33.0
lightningcss-linux-arm64-gnu@1.33.0
lightningcss-linux-arm64-musl@1.33.0
lightningcss-linux-x64-gnu@1.33.0
lightningcss-linux-x64-musl@1.33.0
lightningcss-win32-arm64-msvc@1.33.0
```

Parent packages for these optional entries include `oxlint`, `rolldown`, `typescript`, `lightningcss`, `@emnapi/*`, and `fsevents`; their parent package licenses are included in the installed inventory above where applicable.

## NOTICE and retention notes

- **MIT / ISC / BSD / 0BSD**: preserve the copyright notice and permission notice when redistributing the package.
- **Apache-2.0**: preserve the license, any NOTICE file and attribution notices. `echarts`, `typescript` and `@typescript/typescript-win32-x64` have NOTICE files in the installed packages.
- **MPL-2.0**: `lightningcss` and `lightningcss-win32-x64-msvc` require review of MPL source/notice obligations before redistribution.
- This document records facts and review flags only. It does not provide a legal conclusion about compliance.

## Status

- Installed dependency license metadata: **PASS** (no UNKNOWN/UNLICENSED metadata found).
- Third-party license audit completeness: **PASS for 77 installed packages; NOT VERIFIED for 68 optional non-installed platform entries**.
- Legal review flags: **NEEDS REVIEW** for MPL-2.0 and the four packages lacking a top-level license file.
