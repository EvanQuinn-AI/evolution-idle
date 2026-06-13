using EvolutionIdle.Content;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Economy;
using EvolutionIdle.Core.State;
using EvolutionIdle.Integrations.Cloud;
using NUnit.Framework;

namespace EvolutionIdle.Tests
{
    public sealed class ContentAndCloudTests
    {
        [Test]
        public void CatalogRejectsProgressionCycles()
        {
            var catalog = new GameCatalog
            {
                ContentVersion = "test",
                Upgrades =
                {
                    Upgrade("a", "b"),
                    Upgrade("b", "a")
                }
            };
            Assert.Throws<CatalogValidationException>(() => CatalogValidator.Validate(catalog));
        }

        [Test]
        public void ResolverFastForwardsOnlyDirectDescendants()
        {
            var local = new GameStateSnapshot { ProfileId = "p", ParentHash = "remote" };
            var remote = new GameStateSnapshot { ProfileId = "p", ParentHash = "older" };
            Assert.That(CloudConflictResolver.Decide(local, "local", remote, "remote"), Is.EqualTo(SyncDecision.UploadLocal));
            local.ParentHash = "branch-a";
            Assert.That(CloudConflictResolver.Decide(local, "local", remote, "remote"), Is.EqualTo(SyncDecision.PlayerChoiceRequired));
        }

        private static UpgradeDefinition Upgrade(string id, string prerequisite) => new UpgradeDefinition
        {
            Id = id,
            NameKey = "upgrade." + id,
            BaseCost = BigValue.One,
            CostGrowth = BigValue.One,
            ProductionMultiplier = BigValue.One,
            PrerequisiteIds = { prerequisite }
        };
    }
}
