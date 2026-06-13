using System;
using System.Diagnostics;
using EvolutionIdle.Core.Commands;
using EvolutionIdle.Core.Economy;
using EvolutionIdle.Core.Simulation;
using EvolutionIdle.Core.State;
using NUnit.Framework;

namespace EvolutionIdle.Tests
{
    public sealed class GameSessionTests
    {
        [Test]
        public void FixedStepSimulationIsIndependentOfRenderCadence()
        {
            var first = new GameSession(new FakeClock(), TestCatalog.Create());
            var second = new GameSession(new FakeClock(), TestCatalog.Create());
            for (var i = 0; i < 10; i++) first.Update(0.1);
            for (var i = 0; i < 4; i++) second.Update(0.25);
            Assert.That(first.Current.Currency, Is.EqualTo(second.Current.Currency));
        }

        [Test]
        public void PurchaseAndPrestigeAreAtomicCommands()
        {
            var session = new GameSession(new FakeClock(), TestCatalog.Create());
            Assert.That(session.Dispatch(new PurchaseUpgradeCommand("first")).Succeeded, Is.False);
            session.Dispatch(new GrantCurrencyCommand(100));
            Assert.That(session.Dispatch(new PurchaseUpgradeCommand("first")).Succeeded, Is.True);
            Assert.That(session.Current.UpgradeLevels["first"], Is.EqualTo(1));
            session.Dispatch(new GrantCurrencyCommand(100));
            Assert.That(session.Dispatch(new PrestigeCommand()).Succeeded, Is.True);
            Assert.That(session.Current.Currency, Is.EqualTo(BigValue.Zero));
            Assert.That(session.Current.UpgradeLevels, Is.Empty);
        }

        [Test]
        public void OfflineProgressIsClampedAndClosedForm()
        {
            var clock = new FakeClock();
            var snapshot = new GameStateSnapshot
            {
                ProfileId = "profile",
                ContentVersion = "test",
                LastUtcTicks = clock.UtcNow.UtcDateTime.Ticks,
                Currency = BigValue.Zero
            };
            clock.UtcNow = clock.UtcNow.AddDays(60);
            var session = new GameSession(clock, TestCatalog.Create(), snapshot);
            var stopwatch = Stopwatch.StartNew();
            var elapsed = session.AdvanceOffline();
            stopwatch.Stop();

            Assert.That(elapsed, Is.EqualTo(TimeSpan.FromDays(30)));
            Assert.That(session.Current.Currency, Is.EqualTo(BigValue.FromLong(2_592_000)));
            Assert.That(stopwatch.Elapsed, Is.LessThan(TimeSpan.FromSeconds(1)));
        }

        [Test]
        public void ContentAliasesMigratePersistedIdentifiers()
        {
            var repository = TestCatalog.Create();
            repository.Current.IdAliases["legacy_first"] = "first";
            var clock = new FakeClock();
            var snapshot = new GameStateSnapshot
            {
                ProfileId = "profile",
                ContentVersion = "old",
                Currency = BigValue.Zero,
                LastUtcTicks = clock.UtcNow.UtcDateTime.Ticks,
                UpgradeLevels = { ["legacy_first"] = 3, ["removed"] = 5 }
            };

            var session = new GameSession(clock, repository, snapshot);
            Assert.That(session.Current.UpgradeLevels["first"], Is.EqualTo(3));
            Assert.That(session.Current.UpgradeLevels.ContainsKey("removed"), Is.False);
            Assert.That(session.Current.ContentVersion, Is.EqualTo("test"));
        }

        [Test]
        public void LongTermCollectionStateRoundTripsWithoutLosingProgress()
        {
            var clock = new FakeClock();
            var snapshot = new GameStateSnapshot
            {
                ProfileId = "collector",
                ContentVersion = "test",
                Currency = BigValue.Zero,
                LastUtcTicks = clock.UtcNow.UtcDateTime.Ticks,
                WorldSeed = 12345,
                ActiveOriginAnchorId = "cellular",
                FossilSpeciesId = "bacteria",
                EvolutionMemory = 14,
                DnaFragments = 7,
                MutationPoints = 3,
                DiscoveryKnowledge = 5,
                ExtinctionPressure = 99,
                AwaitingExtinctionDecision = true,
                DiscoveredSpeciesIds = { "bacteria", "fish" },
                UnlockedOriginAnchorIds = { "cellular" },
                SpeciesMastery = { ["bacteria"] = 2 },
                ExtinctionStamps = { ["bacteria"] = new System.Collections.Generic.List<string> { "asteroid" } }
            };

            var session = new GameSession(clock, TestCatalog.Create(), snapshot);
            var exported = session.ExportSnapshot();

            Assert.That(exported.DiscoveredSpeciesIds, Is.EquivalentTo(new[] { "bacteria", "fish" }));
            Assert.That(exported.ExtinctionStamps["bacteria"], Does.Contain("asteroid"));
            Assert.That(exported.UnlockedOriginAnchorIds, Does.Contain("cellular"));
            Assert.That(exported.ActiveOriginAnchorId, Is.EqualTo("cellular"));
            Assert.That(exported.AwaitingExtinctionDecision, Is.True);
            Assert.That(exported.EvolutionMemory, Is.EqualTo(14));
        }
    }
}
