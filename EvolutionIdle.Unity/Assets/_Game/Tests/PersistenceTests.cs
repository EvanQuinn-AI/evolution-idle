using System;
using System.IO;
using System.Threading.Tasks;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.Economy;
using EvolutionIdle.Core.State;
using EvolutionIdle.Persistence;
using EvolutionIdle.Persistence.Migrations;
using NUnit.Framework;
using UnityEngine;

namespace EvolutionIdle.Tests
{
    public sealed class PersistenceTests
    {
        private static SaveEnvelopeCodec CreateCodec() => new SaveEnvelopeCodec(
            new SaveMigrationRegistry(1, new ISaveMigration[] { new InitialSaveMigration() }));

        [Test]
        public void EnvelopeRejectsCorruptedPayload()
        {
            var encoded = CreateCodec().Encode(Snapshot(1));
            encoded.Bytes[^1] ^= 0xff;
            Assert.Throws<InvalidDataException>(() => CreateCodec().Decode(encoded.Bytes));
        }

        [Test]
        public void MigrationAddsVersionOneFields()
        {
            var registry = new SaveMigrationRegistry(1, new ISaveMigration[] { new InitialSaveMigration() });
            var fixturePath = Path.Combine(Application.dataPath, "_Game", "Tests", "Fixtures", "save-v0.json");
            var migrated = registry.Migrate(Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(fixturePath)), 0);
            Assert.That((int)migrated["SchemaVersion"], Is.EqualTo(1));
            Assert.That((long)migrated["ParentRevision"], Is.EqualTo(-1));
        }

        [Test]
        public void EnvelopeDetectsCorruptionAcrossHeaderAndPayload()
        {
            var original = CreateCodec().Encode(Snapshot(9)).Bytes;
            var positions = new[] { 0, 12, original.Length / 3, original.Length / 2, original.Length - 1 };
            foreach (var position in positions)
            {
                var corrupted = (byte[])original.Clone();
                corrupted[position] ^= 0x40;
                Assert.That(() => CreateCodec().Decode(corrupted), Throws.Exception, "Position " + position + " was accepted.");
            }
        }

        [Test]
        public async Task StoreRecoversPreviousVerifiedBackup()
        {
            var directory = Path.Combine(Path.GetTempPath(), "EvolutionIdleTests", Guid.NewGuid().ToString("N"));
            try
            {
                var store = new AtomicFileSaveStore(directory, CreateCodec());
                await store.SaveAsync(Snapshot(1));
                await store.SaveAsync(Snapshot(2));
                var primary = Path.Combine(directory, "save.dat");
                var bytes = File.ReadAllBytes(primary);
                bytes[^1] ^= 0xff;
                File.WriteAllBytes(primary, bytes);

                var loaded = await store.LoadAsync();
                Assert.That(loaded.Status, Is.EqualTo(SaveLoadStatus.RecoveredFromBackup));
                Assert.That(loaded.Snapshot.Revision, Is.EqualTo(1));
            }
            finally
            {
                if (Directory.Exists(directory)) Directory.Delete(directory, true);
            }
        }

        private static GameStateSnapshot Snapshot(long revision) => new GameStateSnapshot
        {
            ProfileId = "profile",
            Revision = revision,
            ParentRevision = revision - 1,
            ContentVersion = "test",
            Currency = BigValue.FromLong(revision),
            LastUtcTicks = DateTimeOffset.UtcNow.UtcDateTime.Ticks
        };
    }
}
