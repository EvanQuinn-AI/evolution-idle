using System;
using EvolutionIdle.Core.Economy;

namespace EvolutionIdle.Core.Events
{
    public abstract class DomainEvent
    {
        public DateTimeOffset OccurredAtUtc { get; }
        protected DomainEvent(DateTimeOffset occurredAtUtc) => OccurredAtUtc = occurredAtUtc;
    }

    public sealed class CurrencyChangedEvent : DomainEvent
    {
        public BigValue Balance { get; }
        public CurrencyChangedEvent(DateTimeOffset occurredAtUtc, BigValue balance) : base(occurredAtUtc) => Balance = balance;
    }

    public sealed class UpgradePurchasedEvent : DomainEvent
    {
        public string UpgradeId { get; }
        public int Level { get; }
        public UpgradePurchasedEvent(DateTimeOffset occurredAtUtc, string upgradeId, int level) : base(occurredAtUtc)
        {
            UpgradeId = upgradeId;
            Level = level;
        }
    }

    public sealed class PrestigeCompletedEvent : DomainEvent
    {
        public int PrestigeCount { get; }
        public PrestigeCompletedEvent(DateTimeOffset occurredAtUtc, int prestigeCount) : base(occurredAtUtc) => PrestigeCount = prestigeCount;
    }

    public sealed class SimulationAdvancedEvent : DomainEvent
    {
        public double Seconds { get; }
        public bool WasOffline { get; }
        public SimulationAdvancedEvent(DateTimeOffset occurredAtUtc, double seconds, bool wasOffline) : base(occurredAtUtc)
        {
            Seconds = seconds;
            WasOffline = wasOffline;
        }
    }

    public sealed class ClockRollbackDetectedEvent : DomainEvent
    {
        public ClockRollbackDetectedEvent(DateTimeOffset occurredAtUtc) : base(occurredAtUtc) { }
    }
}
