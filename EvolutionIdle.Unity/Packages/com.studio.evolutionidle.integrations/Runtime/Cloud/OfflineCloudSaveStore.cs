using System.Threading;
using System.Threading.Tasks;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Integrations.Cloud
{
    public sealed class OfflineCloudSaveStore : ICloudSaveStore
    {
        public Task<CloudSaveResult> DownloadAsync(string profileId, CancellationToken cancellationToken = default)
            => Task.FromResult(new CloudSaveResult(CloudSaveStatus.Offline));

        public Task<CloudSaveResult> UploadAsync(GameStateSnapshot snapshot, CancellationToken cancellationToken = default)
            => Task.FromResult(new CloudSaveResult(CloudSaveStatus.Offline));
    }
}
