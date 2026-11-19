# Calculation Engine Core

`src/engine/` contains the independent TypeScript calculation engine used by
Chemical Process Studio.

It is connected to the production workbench through the UI simulation adapter:
`src/simulation/engineSimulation.ts` calls `adaptUiFlowsheet()`, then
`runSimulation()`, and maps the returned `EngineResult` into the UI view model.
The engine itself does not import React, `@xyflow/react`, the DOM, ECharts or
browser storage.

## Scope

- Steady-state, single-phase liquid material balances.
- Constant-Cp sensible-energy balances for one target-temperature Heater or
  Cooler.
- One or more inlets to one Mixer.
- Acyclic (DAG) flowsheet solving.
- Structured diagnostics, error propagation and calculation traces.
- The teaching components A and B with a constant `Cp = 2.2 kJ/(kg·K)`.

A pressure value is carried through the teaching model, but the current model
does not calculate pressure drop or use pressure in the liquid sensible-energy
balance.

## Unsupported by the current engine

- Recycle loops: cycles are diagnosed and rejected; no single-pass
  approximation is performed.
- Flash Drum, Separator and Pump calculations.
- Vapour-liquid equilibrium, distillation and dynamic simulation.
- Splitter units.
- Pressure-drop or hydraulic calculations.
- Real-fluid property databases and industrial process prediction.

The current UI may allow unsupported equipment to be placed in the flowsheet
for layout demonstration. Those nodes are marked `unsupported` and do not
produce numeric results.

## Canonical units

| Quantity | Unit |
|---|---|
| Mass flow | kg/s |
| Temperature | K |
| Pressure | Pa |
| Heat capacity | J/(kg·K) |
| Duty | W |
| Component mass flow | kg/s |
| Mass fraction | 0–1 |

The UI Adapter converts display units at the boundary. On input:
`t/h → kg/s`, `°C → K`, `bar → Pa`, `wt% → mass fraction`.
On output: `kg/s → t/h`, `K → °C`, `Pa → bar`, `W → kW`, and
`J/(kg·K) → kJ/(kg·K)` for UI display.

## Input and output

Input: a `DomainFlowsheet` containing stream boundary nodes, Mixer/Heater/Cooler
nodes and directed stream edges.

Output: an `EngineResult` containing:

- `status`: `success`, `partial` or `failed`
- calculated streams and equipment results
- structured diagnostics with severity, scope and suggested action
- material balances and closure status
- calculation traces for educational explanation

A blocked or invalid downstream stream is not converted to zero. An
unavailable aggregate balance is returned as unavailable rather than a
fabricated total.

## Diagnostics

Engine diagnostics cover, among other cases:

- empty flowsheet
- missing inlet/outlet or multiple connections
- duplicate node IDs and missing edge endpoints
- cycle detection
- unsupported equipment
- zero/negative flow, invalid pressure or temperature
- non-finite intermediate values and duty overflow
- invalid component compositions
- missing property data
- aggregate balance overflow

The UI exposes these as failed/partial states and never substitutes demo result
data.

## Tests

From the repository root:

```bash
npm run test
```

The test suite covers units, Mixer, Heater/Cooler, solver/DAG behavior, cycle
rejection, duplicate/missing graph structures, diagnostics, finite-value
guards, tiny-flow composition checks, unsupported equipment and trace/result
consistency. A `partial` result can retain valid branches while blocking
unsupported or invalid branches.

## License

The repository currently has no `LICENSE` file and an undecided project
license. The engine must not be presented or redistributed under a specific
license until the project owner makes that decision. See the root README for
the current license status.
