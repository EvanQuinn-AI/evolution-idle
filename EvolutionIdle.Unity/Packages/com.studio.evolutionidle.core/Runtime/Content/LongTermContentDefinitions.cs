using System.Collections.Generic;

namespace EvolutionIdle.Core.Content
{
    public sealed class SpeciesDefinition
    {
        public string Id { get; set; }
        public string NameKey { get; set; }
        public string GroupId { get; set; }
        public string Rarity { get; set; } = "Common";
        public string HabitatId { get; set; }
        public List<string> AlbumIds { get; set; } = new List<string>();
        public List<string> TraitIds { get; set; } = new List<string>();
        public List<string> MasteryObjectiveIds { get; set; } = new List<string>();
        public List<string> ClueKeys { get; set; } = new List<string>();
    }

    public sealed class EvolutionRouteDefinition
    {
        public string Id { get; set; }
        public string SpeciesId { get; set; }
        public List<string> ParentSpeciesIds { get; set; } = new List<string>();
        public List<ContentConditionDefinition> Conditions { get; set; } = new List<ContentConditionDefinition>();
        public List<ContentEffectDefinition> DiscoveryEffects { get; set; } = new List<ContentEffectDefinition>();
    }

    public sealed class AlbumDefinition
    {
        public string Id { get; set; }
        public string NameKey { get; set; }
        public string ChapterId { get; set; }
        public List<string> SpeciesIds { get; set; } = new List<string>();
        public List<ContentEffectDefinition> CompletionRewards { get; set; } = new List<ContentEffectDefinition>();
    }

    public sealed class VariantDefinition
    {
        public string Id { get; set; }
        public string SpeciesId { get; set; }
        public string NameKey { get; set; }
        public List<ContentConditionDefinition> Conditions { get; set; } = new List<ContentConditionDefinition>();
    }

    public sealed class WorldDefinition
    {
        public string Id { get; set; }
        public List<string> BiomeIds { get; set; } = new List<string>();
        public List<string> ModifierPoolIds { get; set; } = new List<string>();
        public List<string> ExtinctionPoolIds { get; set; } = new List<string>();
        public int VisibleModifierCount { get; set; } = 2;
        public int HiddenModifierCount { get; set; } = 1;
    }

    public sealed class CampaignDefinition
    {
        public string Id { get; set; }
        public string NameKey { get; set; }
        public List<string> WorldIds { get; set; } = new List<string>();
        public List<string> AlbumIds { get; set; } = new List<string>();
        public List<ContentConditionDefinition> CompletionConditions { get; set; } = new List<ContentConditionDefinition>();
    }

    public sealed class EventDefinition
    {
        public string Id { get; set; }
        public string Category { get; set; }
        public string TitleKey { get; set; }
        public string BodyKey { get; set; }
        public bool RequiresChoice { get; set; }
        public int CooldownSeconds { get; set; }
        public int PityThreshold { get; set; }
        public List<ContentConditionDefinition> Eligibility { get; set; } = new List<ContentConditionDefinition>();
        public List<EventChoiceDefinition> Choices { get; set; } = new List<EventChoiceDefinition>();
        public List<ContentEffectDefinition> AutomaticEffects { get; set; } = new List<ContentEffectDefinition>();
    }

    public sealed class EventChoiceDefinition
    {
        public string Id { get; set; }
        public string LabelKey { get; set; }
        public string DescriptionKey { get; set; }
        public List<ContentEffectDefinition> Effects { get; set; } = new List<ContentEffectDefinition>();
    }

    public sealed class ExtinctionDefinition
    {
        public string Id { get; set; }
        public string NameKey { get; set; }
        public List<string> OmenKeys { get; set; } = new List<string>();
        public List<string> PreparationIds { get; set; } = new List<string>();
        public List<string> ResistantTraitIds { get; set; } = new List<string>();
        public string SurvivorStampId { get; set; }
    }

    public sealed class OriginAnchorDefinition
    {
        public string Id { get; set; }
        public string NameKey { get; set; }
        public long MemoryCost { get; set; }
        public List<ContentEffectDefinition> StartingEffects { get; set; } = new List<ContentEffectDefinition>();
    }

    public sealed class ContentConditionDefinition
    {
        public string Kind { get; set; }
        public string Id { get; set; }
        public double Value { get; set; }
        public bool Negated { get; set; }
    }

    public sealed class ContentEffectDefinition
    {
        public string Kind { get; set; }
        public string Id { get; set; }
        public double Value { get; set; }
    }
}
