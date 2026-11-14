# Mindmap editor core

Source repository: [julyseaweed/Mindmap](https://github.com/julyseaweed/Mindmap)

Pinned commit: [`a1085c52c6a024226c8ad83f36bc10adc168b3cf`](https://github.com/julyseaweed/Mindmap/commit/a1085c52c6a024226c8ad83f36bc10adc168b3cf)

Imported on: 2026-11-10

These files are copied verbatim from that commit:

| Local file | Upstream path | Purpose |
| --- | --- | --- |
| `core.mjs` | `src/core.mjs` | Document operations, validation, visible tree and layout |
| `text-wrap.mjs` | `src/text-wrap.mjs` | Shared English, Chinese and grapheme-aware text wrapping |
| `tree-connectors.mjs` | `src/tree-connectors.mjs` | Tree branch geometry |
| `node-drag.mjs` | `src/node-drag.mjs` | Branch drop targets and sibling reordering |

The portfolio demo imports these modules so its document behavior follows the desktop app. Browser controls, view state and the embedded presentation belong in the demo adapter outside this directory.

The embedded UI follows the corresponding controls in `src/App.tsx`. Preserve its restrained presentation: no added node counter, promotional document title, reset control or persistent shortcut footer. Document titles come from the map; node editing and deletion belong under the original “More” control.

## Updating

1. Select and record a specific upstream commit.
2. Replace the modules from that commit together, including any new relative imports they require. Keep the upstream algorithms unchanged.
3. Review upstream `src/App.tsx` for corresponding input, editing, history and camera behavior; copying the core alone does not synchronize UI event handling.
4. Run `node --test tests/mindmap-core-parity.test.mjs` from the site checkout, then verify editing, selection, collapse, drag/drop and view preservation in the embedded demo.
5. Update this source record and the demo's asset cache versions before publishing.
