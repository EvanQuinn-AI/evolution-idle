using EvolutionIdle.Core.Economy;
using NUnit.Framework;

namespace EvolutionIdle.Tests
{
    public sealed class BigValueTests
    {
        [Test]
        public void ArithmeticRetainsConfiguredPrecision()
        {
            Assert.That(BigValue.FromLong(10) + BigValue.FromLong(1), Is.EqualTo(BigValue.FromLong(11)));
            Assert.That(BigValue.FromLong(12) * BigValue.FromLong(3), Is.EqualTo(BigValue.FromLong(36)));
            Assert.That(BigValue.Parse("1.25").Pow(2), Is.EqualTo(BigValue.Parse("1.5625")));
        }

        [Test]
        public void WidelySeparatedValuesDoNotOverflow()
        {
            var huge = new BigValue(100_000_000_000L, 1000);
            Assert.That(huge + BigValue.One, Is.EqualTo(huge));
        }
    }
}
