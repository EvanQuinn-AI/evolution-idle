using System;
using EvolutionIdle.Content;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Economy;

namespace EvolutionIdle.Tests
{
    internal sealed class FakeClock : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        public double MonotonicSeconds { get; set; }
    }

    internal static class TestCatalog
    {
        public static InMemoryContentRepository Create()
        {
            return new InMemoryContentRepository(new GameCatalog
            {
                ContentVersion = "test",
                Simulation = new SimulationDefinition
                {
                    TicksPerSecond = 10,
                    MaximumOfflineSeconds = 2_592_000,
                    BaseProductionPerSecond = BigValue.FromLong(1)
                },
                Upgrades =
                {
                    new UpgradeDefinition
                    {
                        Id = "first",
                        NameKey = "upgrade.first",
                        BaseCost = BigValue.FromLong(10),
                        CostGrowth = BigValue.Parse("1.1"),
                        ProductionMultiplier = BigValue.FromLong(2)
                    }
                },
                Prestige = new PrestigeDefinition
                {
                    MinimumCurrency = BigValue.FromLong(100),
                    StartingCurrency = BigValue.Zero
                }
            });
        }
    }
}
