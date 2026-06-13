using System;
using System.Collections.Generic;
using EvolutionIdle.Core.Economy;

namespace EvolutionIdle.Core.Content
{
    public sealed class GameCatalog
    {
        public string ContentVersion { get; set; } = "0.0.0";
        public string MinimumAppVersion { get; set; } = "0.0.0";
        public SimulationDefinition Simulation { get; set; } = new SimulationDefinition();
        public List<UpgradeDefinition> Upgrades { get; set; } = new List<UpgradeDefinition>();
        public PrestigeDefinition Prestige { get; set; } = new PrestigeDefinition();
        public List<SpeciesDefinition> Species { get; set; } = new List<SpeciesDefinition>();
        public List<EvolutionRouteDefinition> EvolutionRoutes { get; set; } = new List<EvolutionRouteDefinition>();
        public List<AlbumDefinition> Albums { get; set; } = new List<AlbumDefinition>();
        public List<VariantDefinition> Variants { get; set; } = new List<VariantDefinition>();
        public List<WorldDefinition> Worlds { get; set; } = new List<WorldDefinition>();
        public List<CampaignDefinition> Campaigns { get; set; } = new List<CampaignDefinition>();
        public List<EventDefinition> Events { get; set; } = new List<EventDefinition>();
        public List<ExtinctionDefinition> Extinctions { get; set; } = new List<ExtinctionDefinition>();
        public List<OriginAnchorDefinition> OriginAnchors { get; set; } = new List<OriginAnchorDefinition>();
        public Dictionary<string, string> IdAliases { get; set; } = new Dictionary<string, string>();
        public List<string> Tombstones { get; set; } = new List<string>();
        public Dictionary<string, string> SourceHashes { get; set; } = new Dictionary<string, string>();

        public UpgradeDefinition FindUpgrade(string id)
        {
            return Upgrades.Find(item => string.Equals(item.Id, id, StringComparison.Ordinal));
        }

        public SpeciesDefinition FindSpecies(string id)
        {
            return Species.Find(item => string.Equals(item.Id, id, StringComparison.Ordinal));
        }
    }

    public sealed class SimulationDefinition
    {
        public int TicksPerSecond { get; set; } = 10;
        public int MaximumOfflineSeconds { get; set; } = 2_592_000;
        public BigValue BaseProductionPerSecond { get; set; } = BigValue.One;
    }

    public sealed class UpgradeDefinition
    {
        public string Id { get; set; }
        public string NameKey { get; set; }
        public BigValue BaseCost { get; set; }
        public BigValue CostGrowth { get; set; } = BigValue.One;
        public BigValue ProductionMultiplier { get; set; } = BigValue.One;
        public List<string> PrerequisiteIds { get; set; } = new List<string>();

        public BigValue CostAtLevel(int level) => BaseCost * CostGrowth.Pow(level);
    }

    public sealed class PrestigeDefinition
    {
        public BigValue MinimumCurrency { get; set; } = BigValue.FromLong(1_000_000);
        public BigValue StartingCurrency { get; set; } = BigValue.Zero;
        public List<string> PreservedUpgradeIds { get; set; } = new List<string>();
    }
}
