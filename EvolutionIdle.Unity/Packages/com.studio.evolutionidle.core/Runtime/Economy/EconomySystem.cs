using System;
using System.Collections.Generic;
using EvolutionIdle.Core.Commands;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Events;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Core.Economy
{
    internal static class EconomySystem
    {
        public static CommandResult Grant(GameState state, long amount, DateTimeOffset now, List<DomainEvent> events)
        {
            if (amount <= 0) return CommandResult.Failure("currency.invalid_grant");
            state.Currency += BigValue.FromLong(amount);
            events.Add(new CurrencyChangedEvent(now, state.Currency));
            return CommandResult.Success();
        }

        public static void Advance(GameState state, GameCatalog catalog, double seconds)
        {
            if (seconds <= 0) return;
            var production = catalog.Simulation.BaseProductionPerSecond;
            foreach (var pair in state.UpgradeLevels)
            {
                var definition = catalog.FindUpgrade(pair.Key);
                if (definition == null || pair.Value <= 0) continue;
                production *= definition.ProductionMultiplier.Pow(pair.Value);
            }

            var wholeMilliseconds = Math.Max(0L, (long)Math.Floor(seconds * 1000d));
            var oneMillisecond = new BigValue(100_000_000_000L, -14);
            state.Currency += production * BigValue.FromLong(wholeMilliseconds) * oneMillisecond;
        }
    }
}
