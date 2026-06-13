using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EvolutionIdle.Core.Abstractions;

namespace EvolutionIdle.Integrations.Commerce
{
    public sealed class SandboxStorefront : IStorefront, IEntitlementService
    {
        private readonly HashSet<string> _entitlements = new HashSet<string>();

        public Task<PurchaseResult> PurchaseAsync(string productId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(productId)) return Task.FromResult(new PurchaseResult(false, productId, error: "product.invalid"));
            _entitlements.Add(productId);
            return Task.FromResult(new PurchaseResult(true, productId, "sandbox-receipt:" + productId));
        }

        public Task RestorePurchasesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public bool HasEntitlement(string entitlementId) => _entitlements.Contains(entitlementId);
    }
}
