using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EvolutionIdle.Core.Commands;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Events;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Core.Abstractions
{
    public interface IClock
    {
        DateTimeOffset UtcNow { get; }
        double MonotonicSeconds { get; }
    }

    public interface IRandomSource
    {
        int Next(int minimumInclusive, int maximumExclusive);
        double NextUnit();
    }

    public interface ICommandBus
    {
        CommandResult Dispatch(GameCommand command);
    }

    public interface IGameStateReader
    {
        GameStateProjection Current { get; }
        event Action<GameStateProjection> StateChanged;
        event Action<IReadOnlyList<DomainEvent>> EventsPublished;
    }

    public interface IContentRepository
    {
        GameCatalog Current { get; }
    }

    public interface ISaveStore
    {
        Task<SaveWriteResult> SaveAsync(GameStateSnapshot snapshot, CancellationToken cancellationToken = default);
        Task<SaveLoadResult> LoadAsync(CancellationToken cancellationToken = default);
    }

    public interface ICloudSaveStore
    {
        Task<CloudSaveResult> DownloadAsync(string profileId, CancellationToken cancellationToken = default);
        Task<CloudSaveResult> UploadAsync(GameStateSnapshot snapshot, CancellationToken cancellationToken = default);
    }

    public interface IAnalyticsSink
    {
        void Enqueue(AnalyticsEvent analyticsEvent);
        Task FlushAsync(CancellationToken cancellationToken = default);
    }

    public interface IStorefront
    {
        Task<PurchaseResult> PurchaseAsync(string productId, CancellationToken cancellationToken = default);
        Task RestorePurchasesAsync(CancellationToken cancellationToken = default);
    }

    public interface IEntitlementService
    {
        bool HasEntitlement(string entitlementId);
    }

    public interface ISecureStorage
    {
        Task<string> ReadAsync(string key, CancellationToken cancellationToken = default);
        Task WriteAsync(string key, string value, CancellationToken cancellationToken = default);
        Task DeleteAsync(string key, CancellationToken cancellationToken = default);
    }

    public sealed class AnalyticsEvent
    {
        public string Name { get; }
        public DateTimeOffset OccurredAtUtc { get; }
        public IReadOnlyDictionary<string, string> Properties { get; }

        public AnalyticsEvent(string name, DateTimeOffset occurredAtUtc, IReadOnlyDictionary<string, string> properties)
        {
            Name = name;
            OccurredAtUtc = occurredAtUtc;
            Properties = properties ?? new Dictionary<string, string>();
        }
    }

    public sealed class PurchaseResult
    {
        public bool Succeeded { get; }
        public string ProductId { get; }
        public string Receipt { get; }
        public string Error { get; }

        public PurchaseResult(bool succeeded, string productId, string receipt = null, string error = null)
        {
            Succeeded = succeeded;
            ProductId = productId;
            Receipt = receipt;
            Error = error;
        }
    }

    public enum SaveLoadStatus
    {
        NotFound,
        Loaded,
        RecoveredFromBackup,
        FutureVersion,
        Corrupt
    }

    public sealed class SaveLoadResult
    {
        public SaveLoadStatus Status { get; }
        public GameStateSnapshot Snapshot { get; }
        public string ContentHash { get; }
        public string Message { get; }

        public SaveLoadResult(SaveLoadStatus status, GameStateSnapshot snapshot = null, string contentHash = null, string message = null)
        {
            Status = status;
            Snapshot = snapshot;
            ContentHash = contentHash;
            Message = message;
        }
    }

    public sealed class SaveWriteResult
    {
        public string ContentHash { get; }
        public SaveWriteResult(string contentHash) => ContentHash = contentHash;
    }

    public enum CloudSaveStatus
    {
        NotFound,
        Success,
        Conflict,
        Offline,
        Failed
    }

    public sealed class CloudSaveResult
    {
        public CloudSaveStatus Status { get; }
        public GameStateSnapshot Snapshot { get; }
        public string Error { get; }

        public CloudSaveResult(CloudSaveStatus status, GameStateSnapshot snapshot = null, string error = null)
        {
            Status = status;
            Snapshot = snapshot;
            Error = error;
        }
    }
}
