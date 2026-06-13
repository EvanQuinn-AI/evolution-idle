using System.Collections.Generic;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.State;

namespace EvolutionIdle.Core.Objectives
{
    public interface IObjectiveEvaluator
    {
        IReadOnlyList<ObjectiveProgress> Evaluate(GameStateProjection state, GameCatalog catalog);
    }

    public sealed class ObjectiveProgress
    {
        public string ObjectiveId { get; }
        public long Current { get; }
        public long Required { get; }
        public bool IsComplete => Current >= Required;

        public ObjectiveProgress(string objectiveId, long current, long required)
        {
            ObjectiveId = objectiveId;
            Current = current;
            Required = required;
        }
    }
}
