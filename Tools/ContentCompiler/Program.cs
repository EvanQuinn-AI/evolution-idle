using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using CsvHelper;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.Economy;
using Newtonsoft.Json;
using NJsonSchema;

var options = CompilerOptions.Parse(args);
var compiler = new CatalogCompiler(options);
await compiler.RunAsync();

internal sealed class CatalogCompiler
{
    private readonly CompilerOptions _options;
    public CatalogCompiler(CompilerOptions options) => _options = options;

    public async Task RunAsync()
    {
        var simulationRows = Read<SimulationRow>("simulation.csv");
        var upgradeRows = Read<UpgradeRow>("upgrades.csv");
        var prestigeRows = Read<PrestigeRow>("prestige.csv");
        var localizationRows = Read<LocalizationRow>("localization.csv");
        if (simulationRows.Count != 1) throw new InvalidDataException("simulation.csv must contain exactly one row.");
        if (prestigeRows.Count != 1) throw new InvalidDataException("prestige.csv must contain exactly one row.");

        var simulation = simulationRows[0];
        var prestige = prestigeRows[0];
        var localizationKeys = localizationRows.Select(row => row.Key).ToHashSet(StringComparer.Ordinal);
        var catalog = new GameCatalog
        {
            ContentVersion = Required(simulation.ContentVersion, "contentVersion"),
            MinimumAppVersion = Required(simulation.MinimumAppVersion, "minimumAppVersion"),
            Simulation = new SimulationDefinition
            {
                TicksPerSecond = simulation.TicksPerSecond,
                MaximumOfflineSeconds = simulation.MaximumOfflineSeconds,
                BaseProductionPerSecond = BigValue.Parse(simulation.BaseProductionPerSecond)
            },
            Prestige = new PrestigeDefinition
            {
                MinimumCurrency = BigValue.Parse(prestige.MinimumCurrency),
                StartingCurrency = BigValue.Parse(prestige.StartingCurrency),
                PreservedUpgradeIds = Split(prestige.PreservedUpgradeIds)
            },
            Upgrades = upgradeRows.Select(row => new UpgradeDefinition
            {
                Id = Required(row.Id, "upgrade.id"),
                NameKey = Required(row.NameKey, "upgrade.nameKey"),
                BaseCost = BigValue.Parse(row.BaseCost),
                CostGrowth = BigValue.Parse(row.CostGrowth),
                ProductionMultiplier = BigValue.Parse(row.ProductionMultiplier),
                PrerequisiteIds = Split(row.PrerequisiteIds)
            }).ToList()
        };

        foreach (var file in Directory.GetFiles(_options.InputDirectory, "*.csv").OrderBy(path => path, StringComparer.Ordinal))
            catalog.SourceHashes[Path.GetFileName(file)] = Hash(await File.ReadAllBytesAsync(file));

        Validate(catalog, localizationKeys);
        var json = JsonConvert.SerializeObject(catalog, Formatting.Indented);
        var schema = await JsonSchema.FromFileAsync(_options.SchemaPath);
        var schemaErrors = schema.Validate(json);
        if (schemaErrors.Count > 0)
            throw new InvalidDataException("Generated catalog failed JSON Schema validation:\n" + string.Join("\n", schemaErrors));

        Directory.CreateDirectory(Path.GetDirectoryName(_options.OutputPath) ?? ".");
        await File.WriteAllTextAsync(_options.OutputPath, json + Environment.NewLine, new UTF8Encoding(false));
        if (!string.IsNullOrWhiteSpace(_options.MirrorPath))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_options.MirrorPath) ?? ".");
            await File.WriteAllTextAsync(_options.MirrorPath, json + Environment.NewLine, new UTF8Encoding(false));
        }
        if (!string.IsNullOrWhiteSpace(_options.IdsOutputPath))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_options.IdsOutputPath) ?? ".");
            await File.WriteAllTextAsync(_options.IdsOutputPath, GenerateIds(catalog), new UTF8Encoding(false));
        }
        await File.WriteAllTextAsync(_options.OutputPath + ".sha256", Hash(Encoding.UTF8.GetBytes(json)) + Environment.NewLine, new UTF8Encoding(false));
        Console.WriteLine($"Compiled {catalog.Upgrades.Count} upgrades to {_options.OutputPath}");
    }

    private List<T> Read<T>(string name)
    {
        var path = Path.Combine(_options.InputDirectory, name);
        using var reader = new StreamReader(path, Encoding.UTF8);
        var configuration = new CsvHelper.Configuration.CsvConfiguration(CultureInfo.InvariantCulture)
        {
            PrepareHeaderForMatch = args => args.Header.ToLowerInvariant()
        };
        using var csv = new CsvReader(reader, configuration);
        return csv.GetRecords<T>().ToList();
    }

    private static void Validate(GameCatalog catalog, HashSet<string> localizationKeys)
    {
        if (catalog.Simulation.TicksPerSecond is < 1 or > 60) throw new InvalidDataException("ticksPerSecond must be between 1 and 60.");
        if (catalog.Simulation.MaximumOfflineSeconds < 0) throw new InvalidDataException("maximumOfflineSeconds cannot be negative.");
        var byId = new Dictionary<string, UpgradeDefinition>(StringComparer.Ordinal);
        foreach (var upgrade in catalog.Upgrades)
        {
            if (!byId.TryAdd(upgrade.Id, upgrade)) throw new InvalidDataException("Duplicate upgrade ID: " + upgrade.Id);
            if (!localizationKeys.Contains(upgrade.NameKey)) throw new InvalidDataException("Missing localization key: " + upgrade.NameKey);
            if (upgrade.BaseCost <= BigValue.Zero) throw new InvalidDataException("Upgrade cost must be positive: " + upgrade.Id);
            if (upgrade.CostGrowth < BigValue.One) throw new InvalidDataException("Upgrade cost growth must be >= 1: " + upgrade.Id);
            if (upgrade.ProductionMultiplier < BigValue.One) throw new InvalidDataException("Upgrade multiplier must be >= 1: " + upgrade.Id);
        }

        foreach (var upgrade in catalog.Upgrades)
            foreach (var prerequisite in upgrade.PrerequisiteIds)
                if (!byId.ContainsKey(prerequisite)) throw new InvalidDataException($"{upgrade.Id} references missing prerequisite {prerequisite}.");

        var visiting = new HashSet<string>(StringComparer.Ordinal);
        var visited = new HashSet<string>(StringComparer.Ordinal);
        foreach (var id in byId.Keys) Visit(id);
        void Visit(string id)
        {
            if (visited.Contains(id)) return;
            if (!visiting.Add(id)) throw new InvalidDataException("Upgrade graph contains a cycle at " + id);
            foreach (var prerequisite in byId[id].PrerequisiteIds) Visit(prerequisite);
            visiting.Remove(id);
            visited.Add(id);
        }
    }

    private static List<string> Split(string? value) => string.IsNullOrWhiteSpace(value)
        ? new List<string>()
        : value.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    private static string Required(string? value, string field) => !string.IsNullOrWhiteSpace(value) ? value : throw new InvalidDataException(field + " is required.");
    private static string Hash(byte[] value) => Convert.ToHexString(SHA256.HashData(value)).ToLowerInvariant();

    private static string GenerateIds(GameCatalog catalog)
    {
        var builder = new StringBuilder();
        builder.AppendLine("// <auto-generated />");
        builder.AppendLine("namespace EvolutionIdle.Content.Generated");
        builder.AppendLine("{");
        builder.AppendLine("    public static class UpgradeIds");
        builder.AppendLine("    {");
        foreach (var upgrade in catalog.Upgrades.OrderBy(item => item.Id, StringComparer.Ordinal))
            builder.AppendLine($"        public const string {ToIdentifier(upgrade.Id)} = \"{upgrade.Id}\";");
        builder.AppendLine("    }");
        builder.AppendLine("}");
        return builder.ToString();
    }

    private static string ToIdentifier(string id)
    {
        var parts = id.Split(new[] { '_', '-', '.' }, StringSplitOptions.RemoveEmptyEntries);
        var identifier = string.Concat(parts.Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
        return char.IsDigit(identifier[0]) ? "Id" + identifier : identifier;
    }
}

internal sealed record CompilerOptions(string InputDirectory, string OutputPath, string SchemaPath, string? MirrorPath, string? IdsOutputPath)
{
    public static CompilerOptions Parse(string[] args)
    {
        string? Read(string key)
        {
            var index = Array.IndexOf(args, key);
            return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
        }

        return new CompilerOptions(
            Read("--input") ?? "Content/SheetsExport",
            Read("--output") ?? "Content/Catalogs/base.catalog.json",
            Read("--schema") ?? "Content/Schemas/catalog.schema.json",
            Read("--mirror"),
            Read("--ids-output"));
    }
}

internal sealed class SimulationRow
{
    public string ContentVersion { get; set; } = "";
    public string MinimumAppVersion { get; set; } = "";
    public int TicksPerSecond { get; set; }
    public int MaximumOfflineSeconds { get; set; }
    public string BaseProductionPerSecond { get; set; } = "";
}

internal sealed class UpgradeRow
{
    public string Id { get; set; } = "";
    public string NameKey { get; set; } = "";
    public string BaseCost { get; set; } = "";
    public string CostGrowth { get; set; } = "";
    public string ProductionMultiplier { get; set; } = "";
    public string PrerequisiteIds { get; set; } = "";
}

internal sealed class PrestigeRow
{
    public string MinimumCurrency { get; set; } = "";
    public string StartingCurrency { get; set; } = "";
    public string PreservedUpgradeIds { get; set; } = "";
}

internal sealed class LocalizationRow
{
    public string Key { get; set; } = "";
    public string En { get; set; } = "";
}
