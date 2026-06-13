using System;
using System.Collections.Generic;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.Commands;
using EvolutionIdle.Core.Content;
using EvolutionIdle.Core.State;
using UnityEngine;
using UnityEngine.UIElements;

namespace EvolutionIdle.Game.Presentation
{
    public sealed class PrototypeScreen : IDisposable
    {
        private readonly ICommandBus _commands;
        private readonly IGameStateReader _state;
        private readonly GameCatalog _catalog;
        private readonly UIDocument _document;
        private readonly Label _currency;
        private readonly Label _prestige;
        private readonly Label _status;
        private readonly Dictionary<string, Button> _upgradeButtons = new Dictionary<string, Button>();

        public PrototypeScreen(GameObject host, ICommandBus commands, IGameStateReader state, GameCatalog catalog, TimeSpan offlineElapsed)
        {
            _commands = commands;
            _state = state;
            _catalog = catalog;

            var panelSettings = ScriptableObject.CreateInstance<PanelSettings>();
            panelSettings.name = "Evolution Idle Runtime Panel";
            panelSettings.scaleMode = PanelScaleMode.ScaleWithScreenSize;
            panelSettings.referenceResolution = new Vector2Int(1080, 1920);
            panelSettings.match = 0.5f;

            _document = host.AddComponent<UIDocument>();
            _document.panelSettings = panelSettings;
            var root = _document.rootVisualElement;
            ConfigureRoot(root);

            var title = new Label("Evolution Idle");
            title.style.fontSize = 42;
            title.style.unityFontStyleAndWeight = FontStyle.Bold;
            title.style.marginBottom = 18;
            root.Add(title);

            _currency = new Label();
            _currency.style.fontSize = 30;
            root.Add(_currency);

            _prestige = new Label();
            _prestige.style.fontSize = 20;
            _prestige.style.marginBottom = 20;
            root.Add(_prestige);

            var grantButton = CreateButton("Prototype: grant 100 biomass", () => Dispatch(new GrantCurrencyCommand(100)));
            root.Add(grantButton);

            foreach (var upgrade in catalog.Upgrades)
            {
                var capturedId = upgrade.Id;
                var button = CreateButton(capturedId, () => Dispatch(new PurchaseUpgradeCommand(capturedId)));
                _upgradeButtons[capturedId] = button;
                root.Add(button);
            }

            root.Add(CreateButton("Prestige", () => Dispatch(new PrestigeCommand())));
            _status = new Label(offlineElapsed > TimeSpan.Zero
                ? "Offline progress applied: " + FormatDuration(offlineElapsed)
                : "Offline-first session ready");
            _status.style.marginTop = 18;
            _status.style.whiteSpace = WhiteSpace.Normal;
            root.Add(_status);

            _state.StateChanged += Render;
            Render(_state.Current);
        }

        public void Dispose()
        {
            _state.StateChanged -= Render;
            if (_document != null && _document.panelSettings != null) UnityEngine.Object.Destroy(_document.panelSettings);
        }

        private void Dispatch(GameCommand command)
        {
            var result = _commands.Dispatch(command);
            _status.text = result.Succeeded ? "Command accepted" : "Command rejected: " + result.ErrorCode;
        }

        private void Render(GameStateProjection projection)
        {
            _currency.text = "Biomass: " + projection.Currency.ToDisplayString();
            _prestige.text = "Prestige: " + projection.PrestigeCount + "  |  Save revision: " + projection.Revision;

            foreach (var definition in _catalog.Upgrades)
            {
                projection.UpgradeLevels.TryGetValue(definition.Id, out var level);
                var cost = definition.CostAtLevel(level);
                var button = _upgradeButtons[definition.Id];
                button.text = definition.Id + "  Lv." + level + "  Cost " + cost.ToDisplayString();
                button.SetEnabled(projection.Currency >= cost && PrerequisitesMet(definition, projection));
            }

            if (projection.ClockRollbackDetected)
                _status.text = "Device clock rollback detected; negative offline time was ignored.";
        }

        private static bool PrerequisitesMet(UpgradeDefinition definition, GameStateProjection projection)
        {
            foreach (var id in definition.PrerequisiteIds)
                if (!projection.UpgradeLevels.TryGetValue(id, out var level) || level <= 0) return false;
            return true;
        }

        private static Button CreateButton(string text, Action action)
        {
            var button = new Button(action) { text = text };
            button.style.height = 58;
            button.style.marginTop = 6;
            button.style.marginBottom = 6;
            button.style.fontSize = 18;
            return button;
        }

        private static void ConfigureRoot(VisualElement root)
        {
            root.style.flexGrow = 1;
            root.style.paddingLeft = 40;
            root.style.paddingRight = 40;
            root.style.paddingTop = 60;
            root.style.paddingBottom = 40;
            root.style.backgroundColor = new Color(0.045f, 0.065f, 0.09f, 1f);
            root.style.color = new Color(0.88f, 0.96f, 0.92f, 1f);
            root.style.maxWidth = 760;
            root.style.alignSelf = Align.Center;
        }

        private static string FormatDuration(TimeSpan value)
        {
            if (value.TotalDays >= 1) return value.TotalDays.ToString("0.0") + " days";
            if (value.TotalHours >= 1) return value.TotalHours.ToString("0.0") + " hours";
            return value.TotalMinutes.ToString("0.0") + " minutes";
        }
    }
}
