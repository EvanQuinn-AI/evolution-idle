using System;
using System.Collections.Generic;
using EvolutionIdle.Core.Commands;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Events;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Core.Progression
{
    internal static class ProgressionSystem
    {
        public static CommandResult Purchase(GameState state, GameCatalog catalog, string upgradeId, DateTimeOffset now, List<DomainEvent> events)
        {
            var definition = catalog.FindUpgrade(upgradeId);
            if (definition == null) return CommandResult.Failure("upgrade.unknown");
            foreach (var prerequisiteId in definition.PrerequisiteIds)
            {
                if (!state.UpgradeLevels.TryGetValue(prerequisiteId, out var prerequisiteLevel) || prerequisiteLevel <= 0)
                    return CommandResult.Failure("upgrade.prerequisite_missing");
            }

            state.UpgradeLevels.TryGetValue(upgradeId, out var currentLevel);
            var cost = definition.CostAtLevel(currentLevel);
            if (state.Currency < cost) return CommandResult.Failure("upgrade.insufficient_currency");

            state.Currency -= cost;
            state.UpgradeLevels[upgradeId] = currentLevel + 1;
            events.Add(new CurrencyChangedEvent(now, state.Currency));
            events.Add(new UpgradePurchasedEvent(now, upgradeId, currentLevel + 1));
            return CommandResult.Success();
        }
    }
}
