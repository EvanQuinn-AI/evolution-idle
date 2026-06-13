using System.Collections.Generic;
using EvolutionIdle.Core.Events;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Core.Achievements
{
    public interface IAchievementEvaluator
    {
        IReadOnlyList<string> Evaluate(GameStateProjection state, IReadOnlyList<DomainEvent> recentEvents);
    }
}
