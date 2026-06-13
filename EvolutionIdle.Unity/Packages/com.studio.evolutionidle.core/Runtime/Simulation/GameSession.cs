using System;
using System.Collections.Generic;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.Commands;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Economy;
using EvolutionIdle.Core.Events;
using EvolutionIdle.Core.Prestige;
using EvolutionIdle.Core.Progression;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Core.Simulation
{
    public sealed class GameSession : ICommandBus, IGameStateReader
    {
        private readonly IClock _clock;
        private readonly GameCatalog _catalog;
        private readonly GameState _state;
        private double _fixedStepAccumulator;

        public GameStateProjection Current => new GameStateProjection(_state);
        public event Action<GameStateProjection> StateChanged;
        public event Action<IReadOnlyList<DomainEvent>> EventsPublished;

        public GameSession(IClock clock, IContentRepository contentRepository, GameStateSnapshot snapshot = null)
        {
            _clock = clock ?? throw new ArgumentNullException(nameof(clock));
            _catalog = contentRepository?.Current ?? throw new ArgumentNullException(nameof(contentRepository));
            _state = snapshot == null ? CreateNewState(_catalog, _clock) : Restore(snapshot, _catalog);
        }

        public CommandResult Dispatch(GameCommand command)
        {
            if (command == null) throw new ArgumentNullException(nameof(command));
            var events = new List<DomainEvent>();
            CommandResult result;

            switch (command)
            {
                case PurchaseUpgradeCommand purchase:
                    result = ProgressionSystem.Purchase(_state, _catalog, purchase.UpgradeId, _clock.UtcNow, events);
                    break;
                case PrestigeCommand _:
                    result = PrestigeSystem.Execute(_state, _catalog, _clock.UtcNow, events);
                    break;
                case GrantCurrencyCommand grant:
                    result = EconomySystem.Grant(_state, grant.Amount, _clock.UtcNow, events);
                    break;
                default:
                    result = CommandResult.Failure("command.unsupported");
                    break;
            }

            if (result.Succeeded)
            {
                Commit(events);
            }

            return result;
        }

        public void Update(double renderedDeltaSeconds)
        {
            if (renderedDeltaSeconds <= 0) return;
            var ticksPerSecond = Math.Max(1, _catalog.Simulation.TicksPerSecond);
            var fixedStep = 1d / ticksPerSecond;
            _fixedStepAccumulator += Math.Min(renderedDeltaSeconds, 1d);
            var events = new List<DomainEvent>();
            var advancedSeconds = 0d;

            while (_fixedStepAccumulator >= fixedStep)
            {
                EconomySystem.Advance(_state, _catalog, fixedStep);
                _fixedStepAccumulator -= fixedStep;
                advancedSeconds += fixedStep;
            }

            if (advancedSeconds > 0)
            {
                events.Add(new SimulationAdvancedEvent(_clock.UtcNow, advancedSeconds, false));
                _state.LastUtcTicks = _clock.UtcNow.UtcDateTime.Ticks;
                _state.LastMonotonicSeconds = _clock.MonotonicSeconds;
                Commit(events);
            }
        }

        public TimeSpan AdvanceOffline()
        {
            var now = _clock.UtcNow;
            var previous = _state.LastUtcTicks > 0 ? new DateTimeOffset(_state.LastUtcTicks, TimeSpan.Zero) : now;
            var elapsed = now - previous;
            var events = new List<DomainEvent>();

            if (elapsed < TimeSpan.Zero)
            {
                elapsed = TimeSpan.Zero;
                _state.ClockRollbackDetected = true;
                events.Add(new ClockRollbackDetectedEvent(now));
            }

            var maximum = TimeSpan.FromSeconds(Math.Max(0, _catalog.Simulation.MaximumOfflineSeconds));
            if (elapsed > maximum) elapsed = maximum;

            if (elapsed > TimeSpan.Zero)
            {
                EconomySystem.Advance(_state, _catalog, elapsed.TotalSeconds);
                events.Add(new SimulationAdvancedEvent(now, elapsed.TotalSeconds, true));
            }

            _state.LastUtcTicks = now.UtcDateTime.Ticks;
            _state.LastMonotonicSeconds = _clock.MonotonicSeconds;
            Commit(events);
            return elapsed;
        }

        public GameStateSnapshot ExportSnapshot(string parentHash = null, long? parentRevision = null)
        {
            return new GameStateSnapshot
            {
                SchemaVersion = 1,
                ProfileId = _state.ProfileId,
                Revision = _state.Revision,
                ParentRevision = parentRevision ?? _state.ParentRevision,
                ParentHash = parentHash ?? _state.ParentHash,
                ContentVersion = _state.ContentVersion,
                Currency = _state.Currency,
                UpgradeLevels = new Dictionary<string, int>(_state.UpgradeLevels),
                PrestigeCount = _state.PrestigeCount,
                DiscoveredSpeciesIds = new List<string>(_state.DiscoveredSpeciesIds),
                DiscoveredVariantIds = new List<string>(_state.DiscoveredVariantIds),
                SpeciesMastery = new Dictionary<string, int>(_state.SpeciesMastery),
                ExtinctionStamps = ExportStamps(_state.ExtinctionStamps),
                UnlockedClueIds = new List<string>(_state.UnlockedClueIds),
                EventOutcomeIds = new List<string>(_state.EventOutcomeIds),
                NotableStoryIds = new List<string>(_state.NotableStoryIds),
                UnlockedOriginAnchorIds = new List<string>(_state.UnlockedOriginAnchorIds),
                CampaignProgress = new Dictionary<string, int>(_state.CampaignProgress),
                WorldSeed = _state.WorldSeed,
                ActiveOriginAnchorId = _state.ActiveOriginAnchorId,
                FossilSpeciesId = _state.FossilSpeciesId,
                ActiveExtinctionId = _state.ActiveExtinctionId,
                ExtinctionPressure = _state.ExtinctionPressure,
                AwaitingExtinctionDecision = _state.AwaitingExtinctionDecision,
                EvolutionMemory = _state.EvolutionMemory,
                DnaFragments = _state.DnaFragments,
                MutationPoints = _state.MutationPoints,
                DiscoveryKnowledge = _state.DiscoveryKnowledge,
                LastUtcTicks = _state.LastUtcTicks,
                LastMonotonicSeconds = _state.LastMonotonicSeconds,
                ClockRollbackDetected = _state.ClockRollbackDetected
            };
        }

        private void Commit(List<DomainEvent> events)
        {
            _state.Revision += 1;
            if (events.Count > 0) EventsPublished?.Invoke(events);
            StateChanged?.Invoke(Current);
        }

        private static GameState CreateNewState(GameCatalog catalog, IClock clock)
        {
            return new GameState
            {
                ContentVersion = catalog.ContentVersion,
                Currency = catalog.Prestige.StartingCurrency,
                LastUtcTicks = clock.UtcNow.UtcDateTime.Ticks,
                LastMonotonicSeconds = clock.MonotonicSeconds
            };
        }

        private static GameState Restore(GameStateSnapshot snapshot, GameCatalog catalog)
        {
            var migratedUpgradeLevels = new Dictionary<string, int>(StringComparer.Ordinal);
            foreach (var pair in snapshot.UpgradeLevels ?? new Dictionary<string, int>())
            {
                var id = catalog.IdAliases != null && catalog.IdAliases.TryGetValue(pair.Key, out var alias) ? alias : pair.Key;
                if (catalog.Tombstones != null && catalog.Tombstones.Contains(id)) continue;
                if (catalog.FindUpgrade(id) == null) continue;
                if (!migratedUpgradeLevels.TryGetValue(id, out var existing) || pair.Value > existing)
                    migratedUpgradeLevels[id] = pair.Value;
            }

            return new GameState
            {
                ProfileId = snapshot.ProfileId,
                Revision = snapshot.Revision,
                ParentRevision = snapshot.ParentRevision,
                ParentHash = snapshot.ParentHash,
                ContentVersion = catalog.ContentVersion,
                Currency = snapshot.Currency,
                UpgradeLevels = migratedUpgradeLevels,
                PrestigeCount = snapshot.PrestigeCount,
                DiscoveredSpeciesIds = new HashSet<string>(snapshot.DiscoveredSpeciesIds ?? new List<string>(), StringComparer.Ordinal),
                DiscoveredVariantIds = new HashSet<string>(snapshot.DiscoveredVariantIds ?? new List<string>(), StringComparer.Ordinal),
                SpeciesMastery = new Dictionary<string, int>(snapshot.SpeciesMastery ?? new Dictionary<string, int>(), StringComparer.Ordinal),
                ExtinctionStamps = RestoreStamps(snapshot.ExtinctionStamps),
                UnlockedClueIds = new HashSet<string>(snapshot.UnlockedClueIds ?? new List<string>(), StringComparer.Ordinal),
                EventOutcomeIds = new HashSet<string>(snapshot.EventOutcomeIds ?? new List<string>(), StringComparer.Ordinal),
                NotableStoryIds = new HashSet<string>(snapshot.NotableStoryIds ?? new List<string>(), StringComparer.Ordinal),
                UnlockedOriginAnchorIds = new HashSet<string>(snapshot.UnlockedOriginAnchorIds ?? new List<string> { "atomic" }, StringComparer.Ordinal),
                CampaignProgress = new Dictionary<string, int>(snapshot.CampaignProgress ?? new Dictionary<string, int>(), StringComparer.Ordinal),
                WorldSeed = snapshot.WorldSeed,
                ActiveOriginAnchorId = string.IsNullOrEmpty(snapshot.ActiveOriginAnchorId) ? "atomic" : snapshot.ActiveOriginAnchorId,
                FossilSpeciesId = snapshot.FossilSpeciesId,
                ActiveExtinctionId = snapshot.ActiveExtinctionId,
                ExtinctionPressure = snapshot.ExtinctionPressure,
                AwaitingExtinctionDecision = snapshot.AwaitingExtinctionDecision,
                EvolutionMemory = snapshot.EvolutionMemory,
                DnaFragments = snapshot.DnaFragments,
                MutationPoints = snapshot.MutationPoints,
                DiscoveryKnowledge = snapshot.DiscoveryKnowledge,
                LastUtcTicks = snapshot.LastUtcTicks,
                LastMonotonicSeconds = snapshot.LastMonotonicSeconds,
                ClockRollbackDetected = snapshot.ClockRollbackDetected
            };
        }

        private static Dictionary<string, List<string>> ExportStamps(Dictionary<string, HashSet<string>> stamps)
        {
            var result = new Dictionary<string, List<string>>(StringComparer.Ordinal);
            foreach (var pair in stamps) result[pair.Key] = new List<string>(pair.Value);
            return result;
        }

        private static Dictionary<string, HashSet<string>> RestoreStamps(Dictionary<string, List<string>> stamps)
        {
            var result = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
            if (stamps == null) return result;
            foreach (var pair in stamps)
                result[pair.Key] = new HashSet<string>(pair.Value ?? new List<string>(), StringComparer.Ordinal);
            return result;
        }
    }
}
