using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.State;
using EvolutionIdle.Persistence.Migrations;
using Newtonsoft.Json;

namespace EvolutionIdle.Persistence
{
    public sealed class AtomicFileSaveStore : ISaveStore
    {
        private const int BackupCount = 3;
        private readonly string _directory;
        private readonly string _primaryPath;
        private readonly string _temporaryPath;
        private readonly SaveEnvelopeCodec _codec;
        private readonly SemaphoreSlim _gate = new SemaphoreSlim(1, 1);

        public AtomicFileSaveStore(string directory, SaveEnvelopeCodec codec)
        {
            _directory = directory ?? throw new ArgumentNullException(nameof(directory));
            _codec = codec ?? throw new ArgumentNullException(nameof(codec));
            _primaryPath = Path.Combine(_directory, "save.dat");
            _temporaryPath = Path.Combine(_directory, "save.tmp");
        }

        public async Task<SaveWriteResult> SaveAsync(GameStateSnapshot snapshot, CancellationToken cancellationToken = default)
        {
            await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                Directory.CreateDirectory(_directory);
                var encoded = _codec.Encode(snapshot);

                using (var stream = new FileStream(_temporaryPath, FileMode.Create, FileAccess.Write, FileShare.None, 16 * 1024, FileOptions.WriteThrough))
                {
                    await stream.WriteAsync(encoded.Bytes, 0, encoded.Bytes.Length, cancellationToken).ConfigureAwait(false);
                    stream.Flush(true);
                }

                var verificationBytes = await ReadAllBytesAsync(_temporaryPath, cancellationToken).ConfigureAwait(false);
                _codec.Decode(verificationBytes);
                RotateBackups();

                if (File.Exists(_primaryPath))
                {
                    File.Replace(_temporaryPath, _primaryPath, BackupPath(1), true);
                }
                else
                {
                    File.Move(_temporaryPath, _primaryPath);
                }

                return new SaveWriteResult(encoded.ContentHash);
            }
            finally
            {
                _gate.Release();
            }
        }

        public async Task<SaveLoadResult> LoadAsync(CancellationToken cancellationToken = default)
        {
            var candidates = new List<string> { _primaryPath };
            for (var index = 1; index <= BackupCount; index++) candidates.Add(BackupPath(index));
            var foundAny = false;
            var errors = new List<string>();

            foreach (var path in candidates)
            {
                if (!File.Exists(path)) continue;
                foundAny = true;
                try
                {
                    var decoded = _codec.Decode(await ReadAllBytesAsync(path, cancellationToken).ConfigureAwait(false));
                    var status = string.Equals(path, _primaryPath, StringComparison.OrdinalIgnoreCase)
                        ? SaveLoadStatus.Loaded
                        : SaveLoadStatus.RecoveredFromBackup;
                    return new SaveLoadResult(status, decoded.Snapshot, decoded.ContentHash);
                }
                catch (FutureSaveVersionException exception)
                {
                    return new SaveLoadResult(SaveLoadStatus.FutureVersion, null, null, exception.Message);
                }
                catch (Exception exception) when (exception is IOException || exception is UnauthorizedAccessException || exception is ArgumentException || exception is OverflowException || exception is JsonException)
                {
                    errors.Add(Path.GetFileName(path) + ": " + exception.Message);
                    Quarantine(path);
                }
            }

            if (!foundAny) return new SaveLoadResult(SaveLoadStatus.NotFound);
            return new SaveLoadResult(SaveLoadStatus.Corrupt, null, null, string.Join(" | ", errors));
        }

        private void RotateBackups()
        {
            for (var index = BackupCount; index >= 2; index--)
            {
                var source = BackupPath(index - 1);
                var destination = BackupPath(index);
                if (!File.Exists(source)) continue;
                if (File.Exists(destination)) File.Delete(destination);
                File.Move(source, destination);
            }
        }

        private void Quarantine(string path)
        {
            try
            {
                var quarantineDirectory = Path.Combine(_directory, "Corrupt");
                Directory.CreateDirectory(quarantineDirectory);
                var name = Path.GetFileName(path) + "." + DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmssfff") + ".corrupt";
                File.Move(path, Path.Combine(quarantineDirectory, name));
            }
            catch (IOException)
            {
                // Recovery must continue even when quarantine storage is unavailable.
            }
        }

        private string BackupPath(int index) => Path.Combine(_directory, "save.bak" + index);

        private static async Task<byte[]> ReadAllBytesAsync(string path, CancellationToken cancellationToken)
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 16 * 1024, true);
            var bytes = new byte[checked((int)stream.Length)];
            var offset = 0;
            while (offset < bytes.Length)
            {
                var read = await stream.ReadAsync(bytes, offset, bytes.Length - offset, cancellationToken).ConfigureAwait(false);
                if (read == 0) throw new EndOfStreamException();
                offset += read;
            }

            return bytes;
        }
    }
}
