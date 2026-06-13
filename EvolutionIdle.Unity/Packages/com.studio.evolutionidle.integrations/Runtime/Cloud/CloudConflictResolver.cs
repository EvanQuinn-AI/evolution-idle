using System;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Integrations.Cloud
{
    public enum SyncDecision
    {
        Identical,
        UploadLocal,
        DownloadRemote,
        PlayerChoiceRequired
    }

    public static class CloudConflictResolver
    {
        public static SyncDecision Decide(GameStateSnapshot local, string localHash, GameStateSnapshot remote, string remoteHash)
        {
            if (local == null) return remote == null ? SyncDecision.Identical : SyncDecision.DownloadRemote;
            if (remote == null) return SyncDecision.UploadLocal;
            if (!string.Equals(local.ProfileId, remote.ProfileId, StringComparison.Ordinal)) return SyncDecision.PlayerChoiceRequired;
            if (string.Equals(localHash, remoteHash, StringComparison.OrdinalIgnoreCase)) return SyncDecision.Identical;
            if (string.Equals(local.ParentHash, remoteHash, StringComparison.OrdinalIgnoreCase)) return SyncDecision.UploadLocal;
            if (string.Equals(remote.ParentHash, localHash, StringComparison.OrdinalIgnoreCase)) return SyncDecision.DownloadRemote;
            return SyncDecision.PlayerChoiceRequired;
        }
    }
}
