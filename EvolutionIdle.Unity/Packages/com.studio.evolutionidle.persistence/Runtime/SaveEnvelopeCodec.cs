using System;
using System.IO;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using EvolutionIdle.Core.State;
using EvolutionIdle.Persistence.Migrations;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EvolutionIdle.Persistence
{
    public sealed class SaveEnvelopeCodec
    {
        private static readonly byte[] Magic = Encoding.ASCII.GetBytes("EIDLESV1");
        public const int CurrentFormatVersion = 1;

        private readonly SaveMigrationRegistry _migrationRegistry;
        private readonly JsonSerializerSettings _jsonSettings;

        public SaveEnvelopeCodec(SaveMigrationRegistry migrationRegistry)
        {
            _migrationRegistry = migrationRegistry ?? throw new ArgumentNullException(nameof(migrationRegistry));
            _jsonSettings = new JsonSerializerSettings
            {
                Formatting = Formatting.None,
                NullValueHandling = NullValueHandling.Include,
                MissingMemberHandling = MissingMemberHandling.Ignore,
                TypeNameHandling = TypeNameHandling.None
            };
        }

        public EncodedSave Encode(GameStateSnapshot snapshot)
        {
            if (snapshot == null) throw new ArgumentNullException(nameof(snapshot));
            if (string.IsNullOrWhiteSpace(snapshot.ProfileId)) throw new InvalidDataException("Save profile ID is required.");
            var json = JsonConvert.SerializeObject(snapshot, _jsonSettings);
            var payload = Compress(Encoding.UTF8.GetBytes(json));
            var savedAtTicks = DateTimeOffset.UtcNow.UtcDateTime.Ticks;
            var checksum = ComputeEnvelopeHash(
                CurrentFormatVersion,
                snapshot.SchemaVersion,
                snapshot.ProfileId,
                snapshot.ContentVersion,
                snapshot.Revision,
                snapshot.ParentRevision,
                snapshot.ParentHash,
                savedAtTicks,
                payload);

            using var stream = new MemoryStream();
            using (var writer = new BinaryWriter(stream, Encoding.UTF8, true))
            {
                writer.Write(Magic);
                writer.Write(CurrentFormatVersion);
                writer.Write(snapshot.SchemaVersion);
                writer.Write(snapshot.ProfileId ?? string.Empty);
                writer.Write(snapshot.ContentVersion ?? string.Empty);
                writer.Write(snapshot.Revision);
                writer.Write(snapshot.ParentRevision);
                writer.Write(snapshot.ParentHash ?? string.Empty);
                writer.Write(savedAtTicks);
                writer.Write(payload.Length);
                writer.Write(checksum.Length);
                writer.Write(checksum);
                writer.Write(payload);
            }

            return new EncodedSave(stream.ToArray(), ToHex(checksum));
        }

        public DecodedSave Decode(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0) throw new InvalidDataException("Save is empty.");
            using var stream = new MemoryStream(bytes, false);
            using var reader = new BinaryReader(stream, Encoding.UTF8, true);

            var magic = reader.ReadBytes(Magic.Length);
            if (!FixedTimeEquals(magic, Magic)) throw new InvalidDataException("Save magic is invalid.");
            var formatVersion = reader.ReadInt32();
            if (formatVersion > CurrentFormatVersion) throw new FutureSaveVersionException(formatVersion, CurrentFormatVersion);
            var schemaVersion = reader.ReadInt32();
            var profileId = reader.ReadString();
            var contentVersion = reader.ReadString();
            var revision = reader.ReadInt64();
            var parentRevision = reader.ReadInt64();
            var parentHash = reader.ReadString();
            var savedAtTicks = reader.ReadInt64();
            var payloadLength = reader.ReadInt32();
            var checksumLength = reader.ReadInt32();
            if (payloadLength < 0 || payloadLength > bytes.Length || checksumLength != 32)
            {
                throw new InvalidDataException("Save envelope lengths are invalid.");
            }

            var expectedChecksum = reader.ReadBytes(checksumLength);
            var payload = reader.ReadBytes(payloadLength);
            if (payload.Length != payloadLength) throw new EndOfStreamException("Save payload is truncated.");
            var actualChecksum = ComputeEnvelopeHash(
                formatVersion,
                schemaVersion,
                profileId,
                contentVersion,
                revision,
                parentRevision,
                parentHash,
                savedAtTicks,
                payload);
            if (!FixedTimeEquals(actualChecksum, expectedChecksum))
            {
                throw new InvalidDataException("Save checksum does not match payload.");
            }

            var json = Encoding.UTF8.GetString(Decompress(payload));
            var document = JObject.Parse(json);
            document = _migrationRegistry.Migrate(document, schemaVersion);
            var snapshot = document.ToObject<GameStateSnapshot>(JsonSerializer.Create(_jsonSettings));
            if (snapshot == null) throw new InvalidDataException("Save payload did not contain a game state.");

            if (!string.Equals(snapshot.ProfileId, profileId, StringComparison.Ordinal) || snapshot.Revision != revision)
            {
                throw new InvalidDataException("Save envelope metadata does not match payload.");
            }

            snapshot.ContentVersion = contentVersion;
            snapshot.ParentRevision = parentRevision;
            snapshot.ParentHash = string.IsNullOrEmpty(parentHash) ? null : parentHash;
            return new DecodedSave(snapshot, ToHex(actualChecksum), new DateTimeOffset(savedAtTicks, TimeSpan.Zero));
        }

        private static byte[] Compress(byte[] value)
        {
            using var output = new MemoryStream();
            using (var gzip = new GZipStream(output, CompressionLevel.Optimal, true)) gzip.Write(value, 0, value.Length);
            return output.ToArray();
        }

        private static byte[] Decompress(byte[] value)
        {
            using var input = new MemoryStream(value, false);
            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            gzip.CopyTo(output);
            return output.ToArray();
        }

        private static byte[] ComputeHash(byte[] value)
        {
            using var sha256 = SHA256.Create();
            return sha256.ComputeHash(value);
        }

        private static byte[] ComputeEnvelopeHash(
            int formatVersion,
            int schemaVersion,
            string profileId,
            string contentVersion,
            long revision,
            long parentRevision,
            string parentHash,
            long savedAtTicks,
            byte[] payload)
        {
            using var integrityStream = new MemoryStream();
            using (var writer = new BinaryWriter(integrityStream, Encoding.UTF8, true))
            {
                writer.Write(formatVersion);
                writer.Write(schemaVersion);
                writer.Write(profileId ?? string.Empty);
                writer.Write(contentVersion ?? string.Empty);
                writer.Write(revision);
                writer.Write(parentRevision);
                writer.Write(parentHash ?? string.Empty);
                writer.Write(savedAtTicks);
                writer.Write(payload.Length);
                writer.Write(payload);
            }

            return ComputeHash(integrityStream.ToArray());
        }

        private static bool FixedTimeEquals(byte[] left, byte[] right)
        {
            if (left == null || right == null || left.Length != right.Length) return false;
            var difference = 0;
            for (var index = 0; index < left.Length; index++) difference |= left[index] ^ right[index];
            return difference == 0;
        }

        private static string ToHex(byte[] value)
        {
            var builder = new StringBuilder(value.Length * 2);
            foreach (var item in value) builder.Append(item.ToString("x2"));
            return builder.ToString();
        }
    }

    public sealed class EncodedSave
    {
        public byte[] Bytes { get; }
        public string ContentHash { get; }
        public EncodedSave(byte[] bytes, string contentHash) { Bytes = bytes; ContentHash = contentHash; }
    }

    public sealed class DecodedSave
    {
        public GameStateSnapshot Snapshot { get; }
        public string ContentHash { get; }
        public DateTimeOffset SavedAtUtc { get; }
        public DecodedSave(GameStateSnapshot snapshot, string contentHash, DateTimeOffset savedAtUtc)
        {
            Snapshot = snapshot;
            ContentHash = contentHash;
            SavedAtUtc = savedAtUtc;
        }
    }
}
