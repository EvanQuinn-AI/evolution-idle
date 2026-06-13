using System;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.Content;
using Newtonsoft.Json;

namespace EvolutionIdle.Content
{
    public sealed class JsonContentRepository : IContentRepository
    {
        public GameCatalog Current { get; }

        public JsonContentRepository(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) throw new ArgumentException("Catalog JSON is empty.", nameof(json));
            Current = JsonConvert.DeserializeObject<GameCatalog>(json) ?? throw new JsonException("Catalog JSON is invalid.");
            CatalogValidator.Validate(Current);
        }
    }

    public sealed class InMemoryContentRepository : IContentRepository
    {
        public GameCatalog Current { get; }
        public InMemoryContentRepository(GameCatalog catalog)
        {
            Current = catalog ?? throw new ArgumentNullException(nameof(catalog));
            CatalogValidator.Validate(Current);
        }
    }
}
