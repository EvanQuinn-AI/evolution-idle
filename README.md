# Evolution Idle

Evolution Idle is an offline-first, data-driven idle game foundation built for Unity 6.3 LTS.

## Architecture

- `EvolutionIdle.Unity/Assets/_Game`: Unity composition, presentation, and platform adapters.
- `EvolutionIdle.Unity/Packages/com.studio.evolutionidle.core`: pure C# domain and simulation.
- `EvolutionIdle.Unity/Packages/com.studio.evolutionidle.persistence`: save envelopes, migrations, and recovery.
- `EvolutionIdle.Unity/Packages/com.studio.evolutionidle.content`: versioned content catalogs.
- `EvolutionIdle.Unity/Packages/com.studio.evolutionidle.integrations`: analytics, cloud, and commerce ports/adapters.
- `Content`: designer-authored source data, schemas, and compiled catalogs.
- `Tools/ContentCompiler`: CSV-to-catalog compiler and validator.
- `Docs`: architecture decisions and operating notes.

The domain package deliberately has no Unity, storage, networking, analytics, or storefront dependencies.

## Getting Started

1. Install Unity 6.3 LTS with Android, iOS, Windows, and macOS build support as needed.
2. Open `EvolutionIdle.Unity` in Unity Hub.
3. Run the content compiler with `dotnet run --project Tools/ContentCompiler -- --input Content/SheetsExport --output Content/Catalogs/base.catalog.json --mirror EvolutionIdle.Unity/Assets/StreamingAssets/Content/base.catalog.json --ids-output EvolutionIdle.Unity/Packages/com.studio.evolutionidle.content/Runtime/Generated/ContentIds.cs --schema Content/Schemas/catalog.schema.json`.
4. Commit both generated catalog copies when changing content.
5. Enter Play Mode. `GameBootstrap` creates the technical-prototype UI without requiring a scene.

See `Docs/ARCHITECTURE.md` for boundaries, `Docs/GAME_DESIGN.md` for the encyclopedia-first gameplay specification, `Docs/CREATURE_ART_DIRECTION.md` for the scalable visual and Unity asset pipeline, `Docs/CREATURE_ROSTER_AUDIT.md` for current-roster redesign priorities, `Docs/TOMORROW_PROTOTYPE.md` for the one-day fun test, and `Docs/ROADMAP.md` for delivery phases.
