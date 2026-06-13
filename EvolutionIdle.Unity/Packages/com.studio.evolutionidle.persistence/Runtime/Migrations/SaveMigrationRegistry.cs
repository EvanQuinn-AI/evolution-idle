using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace EvolutionIdle.Persistence.Migrations
{
    public interface ISaveMigration
    {
        int FromVersion { get; }
        int ToVersion { get; }
        JObject Migrate(JObject source);
    }

    public sealed class SaveMigrationRegistry
    {
        private readonly Dictionary<int, ISaveMigration> _migrations = new Dictionary<int, ISaveMigration>();
        public int CurrentSchemaVersion { get; }

        public SaveMigrationRegistry(int currentSchemaVersion, IEnumerable<ISaveMigration> migrations)
        {
            CurrentSchemaVersion = currentSchemaVersion;
            foreach (var migration in migrations ?? Array.Empty<ISaveMigration>())
            {
                if (migration.ToVersion != migration.FromVersion + 1)
                {
                    throw new ArgumentException("Save migrations must advance exactly one schema version.");
                }

                if (_migrations.ContainsKey(migration.FromVersion))
                {
                    throw new ArgumentException("Duplicate migration from schema " + migration.FromVersion + ".");
                }

                _migrations.Add(migration.FromVersion, migration);
            }
        }

        public JObject Migrate(JObject source, int sourceVersion)
        {
            if (sourceVersion > CurrentSchemaVersion)
            {
                throw new FutureSaveVersionException(sourceVersion, CurrentSchemaVersion);
            }

            var current = source;
            var version = sourceVersion;
            while (version < CurrentSchemaVersion)
            {
                if (!_migrations.TryGetValue(version, out var migration))
                {
                    throw new InvalidOperationException("Missing save migration from schema " + version + ".");
                }

                current = migration.Migrate(current) ?? throw new InvalidOperationException("Migration returned null.");
                version = migration.ToVersion;
                current["SchemaVersion"] = version;
            }

            return current;
        }
    }

    public sealed class InitialSaveMigration : ISaveMigration
    {
        public int FromVersion => 0;
        public int ToVersion => 1;

        public JObject Migrate(JObject source)
        {
            source["ParentRevision"] ??= -1;
            source["ParentHash"] ??= JValue.CreateNull();
            source["ClockRollbackDetected"] ??= false;
            source["UpgradeLevels"] ??= new JObject();
            return source;
        }
    }

    public sealed class FutureSaveVersionException : Exception
    {
        public int SaveVersion { get; }
        public int SupportedVersion { get; }

        public FutureSaveVersionException(int saveVersion, int supportedVersion)
            : base("Save schema " + saveVersion + " is newer than supported schema " + supportedVersion + ".")
        {
            SaveVersion = saveVersion;
            SupportedVersion = supportedVersion;
        }
    }
}
