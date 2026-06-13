namespace EvolutionIdle.Core.Commands
{
    public abstract class GameCommand
    {
    }

    public sealed class PurchaseUpgradeCommand : GameCommand
    {
        public string UpgradeId { get; }
        public PurchaseUpgradeCommand(string upgradeId) => UpgradeId = upgradeId;
    }

    public sealed class PrestigeCommand : GameCommand
    {
    }

    public sealed class GrantCurrencyCommand : GameCommand
    {
        public long Amount { get; }
        public GrantCurrencyCommand(long amount) => Amount = amount;
    }

    public sealed class CommandResult
    {
        public bool Succeeded { get; }
        public string ErrorCode { get; }

        private CommandResult(bool succeeded, string errorCode)
        {
            Succeeded = succeeded;
            ErrorCode = errorCode;
        }

        public static CommandResult Success() => new CommandResult(true, null);
        public static CommandResult Failure(string errorCode) => new CommandResult(false, errorCode);
    }
}
