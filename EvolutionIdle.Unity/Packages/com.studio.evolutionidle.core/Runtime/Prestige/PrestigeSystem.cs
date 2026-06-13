using System;
using System.Collections.Generic;
using EvolutionIdle.Core.Commands;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Events;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Core.Prestige
{
    internal static class PrestigeSystem
    {
        public static CommandResult Execute(GameState state, GameCatalog catalog, DateTimeOffset now, List<DomainEvent> events)
        {
            if (state.Currency < catalog.Prestige.MinimumCurrency)
                return CommandResult.Failure("prestige.requirement_not_met");

            var preserved = new Dictionary<string, int>(StringComparer.Ordinal);
            foreach (var id in catalog.Prestige.PreservedUpgradeIds)
                if (state.UpgradeLevels.TryGetValue(id, out var level)) preserved[id] = level;

            state.Currency = catalog.Prestige.StartingCurrency;
            state.UpgradeLevels = preserved;
            state.PrestigeCount += 1;
            events.Add(new PrestigeCompletedEvent(now, state.PrestigeCount));
            events.Add(new CurrencyChangedEvent(now, state.Currency));
            return CommandResult.Success();
        }
    }
}
