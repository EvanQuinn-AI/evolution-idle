using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Economy;

namespace EvolutionIdle.Content
{
    public static class CatalogValidator
    {
        private static readonly Regex IdPattern = new Regex("^[a-z][a-z0-9_.-]*$", RegexOptions.Compiled);

        public static void Validate(GameCatalog catalog)
        {
            if (catalog == null) throw new CatalogValidationException("Catalog is null.");
            if (string.IsNullOrWhiteSpace(catalog.ContentVersion)) throw new CatalogValidationException("ContentVersion is required.");
            if (catalog.Simulation == null) throw new CatalogValidationException("Simulation definition is required.");
            if (catalog.Simulation.TicksPerSecond < 1 || catalog.Simulation.TicksPerSecond > 60)
                throw new CatalogValidationException("TicksPerSecond must be between 1 and 60.");
            if (catalog.Simulation.MaximumOfflineSeconds < 0)
                throw new CatalogValidationException("MaximumOfflineSeconds cannot be negative.");
            if (catalog.Simulation.BaseProductionPerSecond < BigValue.Zero)
                throw new CatalogValidationException("Base production cannot be negative.");
            if (catalog.Prestige == null) throw new CatalogValidationException("Prestige definition is required.");

            var definitions = new Dictionary<string, UpgradeDefinition>(StringComparer.Ordinal);
            foreach (var upgrade in catalog.Upgrades ?? new List<UpgradeDefinition>())
            {
                if (upgrade == null || !IdPattern.IsMatch(upgrade.Id ?? string.Empty))
                    throw new CatalogValidationException("Upgrade ID is missing or invalid.");
                if (!definitions.TryAdd(upgrade.Id, upgrade))
                    throw new CatalogValidationException("Duplicate upgrade ID: " + upgrade.Id);
                if (string.IsNullOrWhiteSpace(upgrade.NameKey))
                    throw new CatalogValidationException("Upgrade " + upgrade.Id + " has no localization key.");
                if (upgrade.BaseCost <= BigValue.Zero)
                    throw new CatalogValidationException("Upgrade " + upgrade.Id + " must have a positive cost.");
                if (upgrade.CostGrowth < BigValue.One)
                    throw new CatalogValidationException("Upgrade " + upgrade.Id + " cost growth must be at least one.");
                if (upgrade.ProductionMultiplier < BigValue.One)
                    throw new CatalogValidationException("Upgrade " + upgrade.Id + " multiplier must be at least one.");
            }

            foreach (var upgrade in definitions.Values)
            {
                foreach (var prerequisite in upgrade.PrerequisiteIds ?? new List<string>())
                {
                    if (!definitions.ContainsKey(prerequisite))
                        throw new CatalogValidationException("Upgrade " + upgrade.Id + " references missing prerequisite " + prerequisite + ".");
                }
            }

            DetectCycles(definitions);
            foreach (var preservedId in catalog.Prestige?.PreservedUpgradeIds ?? new List<string>())
            {
                if (!definitions.ContainsKey(preservedId))
                    throw new CatalogValidationException("Prestige preserves missing upgrade " + preservedId + ".");
            }
        }

        private static void DetectCycles(Dictionary<string, UpgradeDefinition> definitions)
        {
            var visiting = new HashSet<string>(StringComparer.Ordinal);
            var visited = new HashSet<string>(StringComparer.Ordinal);
            foreach (var id in definitions.Keys) Visit(id, definitions, visiting, visited);
        }

        private static void Visit(string id, Dictionary<string, UpgradeDefinition> definitions, HashSet<string> visiting, HashSet<string> visited)
        {
            if (visited.Contains(id)) return;
            if (!visiting.Add(id)) throw new CatalogValidationException("Upgrade graph contains a cycle at " + id + ".");
            foreach (var prerequisite in definitions[id].PrerequisiteIds ?? new List<string>()) Visit(prerequisite, definitions, visiting, visited);
            visiting.Remove(id);
            visited.Add(id);
        }
    }

    public sealed class CatalogValidationException : Exception
    {
        public CatalogValidationException(string message) : base(message) { }
    }
}
