using System;
using System.Globalization;
using System.Numerics;

namespace EvolutionIdle.Core.Economy
{
    public readonly struct BigValue : IComparable<BigValue>, IEquatable<BigValue>
    {
        public const int Precision = 12;
        private const long MinimumNormalized = 100_000_000_000L;
        private const long MaximumNormalized = 1_000_000_000_000L;

        public static BigValue Zero => new BigValue(0, 0, false);
        public static BigValue One => FromLong(1);

        public long Significand { get; }
        public int Exponent { get; }
        public bool IsZero => Significand == 0;

        public BigValue(long significand, int exponent)
            : this(significand, exponent, true)
        {
        }

        private BigValue(long significand, int exponent, bool normalize)
        {
            if (!normalize || significand == 0)
            {
                Significand = significand;
                Exponent = significand == 0 ? 0 : exponent;
                return;
            }

            var normalized = Normalize(new BigInteger(significand), exponent);
            Significand = normalized.Significand;
            Exponent = normalized.Exponent;
        }

        public static BigValue FromLong(long value)
        {
            return value == 0 ? Zero : Normalize(new BigInteger(value), 0);
        }

        public static BigValue Parse(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new FormatException("BigValue cannot be empty.");
            }

            var text = value.Trim();
            var negative = text.StartsWith("-", StringComparison.Ordinal);
            if (negative || text.StartsWith("+", StringComparison.Ordinal)) text = text.Substring(1);
            var exponent = 0;
            var exponentIndex = text.IndexOfAny(new[] { 'e', 'E' });
            if (exponentIndex >= 0)
            {
                exponent = int.Parse(text.Substring(exponentIndex + 1), NumberStyles.Integer, CultureInfo.InvariantCulture);
                text = text.Substring(0, exponentIndex);
            }

            var decimalIndex = text.IndexOf('.');
            if (decimalIndex >= 0)
            {
                exponent -= text.Length - decimalIndex - 1;
                text = text.Remove(decimalIndex, 1);
            }

            text = text.TrimStart('0');
            if (text.Length == 0) return Zero;
            if (!BigInteger.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out var digits))
                throw new FormatException("Invalid BigValue: " + value);
            return Normalize(negative ? -digits : digits, exponent);
        }

        public BigValue Pow(int power)
        {
            if (power < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(power));
            }

            var result = One;
            var factor = this;
            var remaining = power;
            while (remaining > 0)
            {
                if ((remaining & 1) == 1)
                {
                    result *= factor;
                }

                remaining >>= 1;
                if (remaining > 0)
                {
                    factor *= factor;
                }
            }

            return result;
        }

        public double ToDouble()
        {
            return Significand * Math.Pow(10, Exponent);
        }

        public string ToDisplayString(int decimals = 2)
        {
            if (IsZero)
            {
                return "0";
            }

            var scientificExponent = Exponent + Precision - 1;
            var mantissa = Significand / (double)MinimumNormalized;
            if (scientificExponent >= 6 || scientificExponent <= -4)
            {
                return mantissa.ToString("F" + decimals, CultureInfo.InvariantCulture) + "e" + scientificExponent;
            }

            return ToDouble().ToString("N" + decimals, CultureInfo.InvariantCulture);
        }

        public int CompareTo(BigValue other)
        {
            if (Significand == other.Significand && Exponent == other.Exponent)
            {
                return 0;
            }

            if (Significand >= 0 && other.Significand < 0) return 1;
            if (Significand < 0 && other.Significand >= 0) return -1;
            if (IsZero) return -other.Significand.CompareTo(0);
            if (other.IsZero) return Significand.CompareTo(0);

            var sign = Math.Sign(Significand);
            if (Exponent != other.Exponent)
            {
                return Exponent.CompareTo(other.Exponent) * sign;
            }

            return Significand.CompareTo(other.Significand);
        }

        public bool Equals(BigValue other) => Significand == other.Significand && Exponent == other.Exponent;
        public override bool Equals(object obj) => obj is BigValue other && Equals(other);
        public override int GetHashCode() => HashCode.Combine(Significand, Exponent);
        public override string ToString() => Significand.ToString(CultureInfo.InvariantCulture) + "e" + Exponent;

        public static BigValue operator +(BigValue left, BigValue right)
        {
            if (left.IsZero) return right;
            if (right.IsZero) return left;

            var commonExponent = Math.Max(left.Exponent, right.Exponent);
            var leftShift = commonExponent - left.Exponent;
            var rightShift = commonExponent - right.Exponent;
            var leftValue = leftShift >= Precision + 1 ? BigInteger.Zero : DivideRounded(left.Significand, Pow10Long(leftShift));
            var rightValue = rightShift >= Precision + 1 ? BigInteger.Zero : DivideRounded(right.Significand, Pow10Long(rightShift));
            return Normalize(leftValue + rightValue, commonExponent);
        }

        public static BigValue operator -(BigValue left, BigValue right) => left + new BigValue(-right.Significand, right.Exponent, false);
        public static BigValue operator *(BigValue left, BigValue right)
        {
            if (left.IsZero || right.IsZero) return Zero;
            return Normalize(new BigInteger(left.Significand) * right.Significand, checked(left.Exponent + right.Exponent));
        }

        public static BigValue operator *(BigValue left, long right) => left * FromLong(right);
        public static bool operator >=(BigValue left, BigValue right) => left.CompareTo(right) >= 0;
        public static bool operator <=(BigValue left, BigValue right) => left.CompareTo(right) <= 0;
        public static bool operator >(BigValue left, BigValue right) => left.CompareTo(right) > 0;
        public static bool operator <(BigValue left, BigValue right) => left.CompareTo(right) < 0;
        public static bool operator ==(BigValue left, BigValue right) => left.Equals(right);
        public static bool operator !=(BigValue left, BigValue right) => !left.Equals(right);

        private static BigValue Normalize(BigInteger value, int exponent)
        {
            if (value.IsZero) return Zero;

            var negative = value.Sign < 0;
            value = BigInteger.Abs(value);
            while (value >= MaximumNormalized)
            {
                var quotient = BigInteger.DivRem(value, 10, out var remainder);
                if (remainder >= 5) quotient += 1;
                value = quotient;
                exponent = checked(exponent + 1);
            }

            while (value < MinimumNormalized)
            {
                value *= 10;
                exponent = checked(exponent - 1);
            }

            var significand = (long)value;
            return new BigValue(negative ? -significand : significand, exponent, false);
        }

        private static long Pow10Long(int power)
        {
            if (power <= 0) return 1;
            if (power > Precision + 1) return long.MaxValue;
            var result = 1L;
            for (var i = 0; i < power; i++) result *= 10;
            return result;
        }

        private static BigInteger DivideRounded(long value, long divisor)
        {
            if (divisor <= 1) return value;
            var absolute = BigInteger.Abs(new BigInteger(value));
            var quotient = BigInteger.DivRem(absolute, divisor, out var remainder);
            if (remainder * 2 >= divisor) quotient += 1;
            return value < 0 ? -quotient : quotient;
        }
    }
}
