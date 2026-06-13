using System;
using EvolutionIdle.Core.Abstractions;
using UnityEngine;

namespace EvolutionIdle.Game.Platform
{
    public sealed class UnityClock : IClock
    {
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
        public double MonotonicSeconds => Time.realtimeSinceStartupAsDouble;
    }
}
