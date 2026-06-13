using System;
using System.Collections.Generic;
using EvolutionIdle.Core.Economy;

namespace EvolutionIdle.Core.State
{
    internal sealed class GameState
    {
        public string ProfileId = Guid.NewGuid().ToString("N");
        public long Revision;
        public long ParentRevision = -1;
        public string ParentHash;
        public string ContentVersion;
        public BigValue Currency;
        public Dictionary<string, int> UpgradeLevels = new Dictionary<string, int>(StringComparer.Ordinal);
        public int PrestigeCount;
        public HashSet<string> DiscoveredSpeciesIds = new HashSet<string>(StringComparer.Ordinal);
        public HashSet<string> DiscoveredVariantIds = new HashSet<string>(StringComparer.Ordinal);
        public Dictionary<string, int> SpeciesMastery = new Dictionary<string, int>(StringComparer.Ordinal);
        public Dictionary<string, HashSet<string>> ExtinctionStamps = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        public HashSet<string> UnlockedClueIds = new HashSet<string>(StringComparer.Ordinal);
        public HashSet<string> EventOutcomeIds = new HashSet<string>(StringComparer.Ordinal);
        public HashSet<string> NotableStoryIds = new HashSet<string>(StringComparer.Ordinal);
        public HashSet<string> UnlockedOriginAnchorIds = new HashSet<string>(StringComparer.Ordinal) { "atomic" };
        public Dictionary<string, int> CampaignProgress = new Dictionary<string, int>(StringComparer.Ordinal);
        public long WorldSeed;
        public string ActiveOriginAnchorId = "atomic";
        public string FossilSpeciesId;
        public string ActiveExtinctionId;
        public double ExtinctionPressure;
        public bool AwaitingExtinctionDecision;
        public long EvolutionMemory;
        public long DnaFragments;
        public long MutationPoints;
        public long DiscoveryKnowledge;
        public long LastUtcTicks;
        public double LastMonotonicSeconds;
        public bool ClockRollbackDetected;
    }

    public sealed class GameStateProjection
    {
        public string ProfileId { get; }
        public long Revision { get; }
        public string ContentVersion { get; }
        public BigValue Currency { get; }
        public IReadOnlyDictionary<string, int> UpgradeLevels { get; }
        public int PrestigeCount { get; }
        public IReadOnlyCollection<string> DiscoveredSpeciesIds { get; }
        public IReadOnlyDictionary<string, int> SpeciesMastery { get; }
        public IReadOnlyCollection<string> UnlockedOriginAnchorIds { get; }
        public string ActiveOriginAnchorId { get; }
        public long EvolutionMemory { get; }
        public long DnaFragments { get; }
        public long MutationPoints { get; }
        public long DiscoveryKnowledge { get; }
        public double ExtinctionPressure { get; }
        public bool AwaitingExtinctionDecision { get; }
        public bool ClockRollbackDetected { get; }

        internal GameStateProjection(GameState state)
        {
            ProfileId = state.ProfileId;
            Revision = state.Revision;
            ContentVersion = state.ContentVersion;
            Currency = state.Currency;
            UpgradeLevels = new Dictionary<string, int>(state.UpgradeLevels);
            PrestigeCount = state.PrestigeCount;
            DiscoveredSpeciesIds = new List<string>(state.DiscoveredSpeciesIds);
            SpeciesMastery = new Dictionary<string, int>(state.SpeciesMastery);
            UnlockedOriginAnchorIds = new List<string>(state.UnlockedOriginAnchorIds);
            ActiveOriginAnchorId = state.ActiveOriginAnchorId;
            EvolutionMemory = state.EvolutionMemory;
            DnaFragments = state.DnaFragments;
            MutationPoints = state.MutationPoints;
            DiscoveryKnowledge = state.DiscoveryKnowledge;
            ExtinctionPressure = state.ExtinctionPressure;
            AwaitingExtinctionDecision = state.AwaitingExtinctionDecision;
            ClockRollbackDetected = state.ClockRollbackDetected;
        }
    }

    public sealed class GameStateSnapshot
    {
        public int SchemaVersion { get; set; } = 1;
        public string ProfileId { get; set; }
        public long Revision { get; set; }
        public long ParentRevision { get; set; }
        public string ParentHash { get; set; }
        public string ContentVersion { get; set; }
        public BigValue Currency { get; set; }
        public Dictionary<string, int> UpgradeLevels { get; set; } = new Dictionary<string, int>();
        public int PrestigeCount { get; set; }
        public List<string> DiscoveredSpeciesIds { get; set; } = new List<string>();
        public List<string> DiscoveredVariantIds { get; set; } = new List<string>();
        public Dictionary<string, int> SpeciesMastery { get; set; } = new Dictionary<string, int>();
        public Dictionary<string, List<string>> ExtinctionStamps { get; set; } = new Dictionary<string, List<string>>();
        public List<string> UnlockedClueIds { get; set; } = new List<string>();
        public List<string> EventOutcomeIds { get; set; } = new List<string>();
        public List<string> NotableStoryIds { get; set; } = new List<string>();
        public List<string> UnlockedOriginAnchorIds { get; set; } = new List<string> { "atomic" };
        public Dictionary<string, int> CampaignProgress { get; set; } = new Dictionary<string, int>();
        public long WorldSeed { get; set; }
        public string ActiveOriginAnchorId { get; set; } = "atomic";
        public string FossilSpeciesId { get; set; }
        public string ActiveExtinctionId { get; set; }
        public double ExtinctionPressure { get; set; }
        public bool AwaitingExtinctionDecision { get; set; }
        public long EvolutionMemory { get; set; }
        public long DnaFragments { get; set; }
        public long MutationPoints { get; set; }
        public long DiscoveryKnowledge { get; set; }
        public long LastUtcTicks { get; set; }
        public double LastMonotonicSeconds { get; set; }
        public bool ClockRollbackDetected { get; set; }
    }
}
