# Evolution Idle Architecture

## Dependency Rule

Dependencies point inward:

```text
Presentation / Platform / Integrations
                 |
          Persistence / Content
                 |
              Core Domain
```

`EvolutionIdle.Core` is deterministic pure C#. It owns game state, commands, domain events, simulation systems, and service ports. It must never reference `UnityEngine`, SDKs, files, HTTP, analytics, or storefront APIs.

## Runtime Flow

1. Presentation submits an immutable command to `ICommandBus`.
2. `GameSession` validates and applies the command to the authoritative `GameState`.
3. Domain systems advance sequentially at a fixed logical rate or across an offline duration.
4. Mutations emit typed domain events.
5. Read-only projections notify presentation view models.
6. Save and analytics adapters consume snapshots/events without gaining mutation authority.

## State Ownership

- `GameSession` is the only mutable aggregate owner.
- UI receives `GameStateProjection`, never the mutable aggregate.
- Commands are serialized through one queue.
- Economy calculations use `BigValue`; floating-point values are not persisted for currencies.
- Randomness and time are injected through `IRandomSource` and `IClock`.

## Offline Progression

The session stores UTC and monotonic timestamps. On resume it clamps elapsed UTC to the content-configured maximum, flags rollback, and calls each system's `Advance` method once. Systems use closed-form calculations or meaningful event boundaries instead of replaying rendered frames.

## Persistence

The local save is a binary envelope around gzip-compressed JSON. Envelope metadata and payload checksums are verified before deserialization. Writes use temporary-file verification and atomic replacement, with rotating backups and corrupt-file quarantine.

Schema migrations are ordered pure transformations. A client that sees a future schema refuses to overwrite it.

## Content

CSV source files compile into one immutable catalog. The compiler validates identifiers, references, ranges, duplicate IDs, graph cycles, localization keys, and the generated JSON schema. Runtime code consumes typed definitions only.

## Extension Points

- Cloud save: implement `ICloudSaveStore` without changing domain code.
- Analytics: add `IAnalyticsSink` adapters; events remain typed and queued offline.
- Stores: `IStorefront` returns verified purchase results; domain commands grant rewards.
- Multiplayer: introduce a server-authoritative command endpoint around the same domain contracts.
- LiveOps: deliver signed catalogs accepted only when schema/app version constraints pass.
