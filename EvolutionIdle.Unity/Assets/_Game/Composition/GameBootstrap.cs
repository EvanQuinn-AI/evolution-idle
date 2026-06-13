using System;
using System.IO;
using System.Threading.Tasks;
using EvolutionIdle.Content;
using EvolutionIdle.Core.Abstractions;
using EvolutionIdle.Core.Simulation;
using EvolutionIdle.Game.Platform;
using EvolutionIdle.Game.Presentation;
using EvolutionIdle.Persistence;
using EvolutionIdle.Persistence.Migrations;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UIElements;

namespace EvolutionIdle.Game.Composition
{
    public sealed class GameBootstrap : MonoBehaviour
    {
        private const float AutosaveIntervalSeconds = 15f;
        private GameSession _session;
        private ISaveStore _saveStore;
        private PrototypeScreen _screen;
        private string _lastSaveHash;
        private long _lastSavedRevision = -1;
        private float _autosaveCountdown = AutosaveIntervalSeconds;
        private bool _saveInProgress;
        private bool _skipNextFrameAfterResume;
        private bool _wasBackgrounded;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Create()
        {
            if (FindFirstObjectByType<GameBootstrap>() != null) return;
            var host = new GameObject("Evolution Idle");
            DontDestroyOnLoad(host);
            host.AddComponent<GameBootstrap>();
        }

        private async void Start()
        {
            try
            {
                var catalogJson = await LoadStreamingText("Content/base.catalog.json");
                var content = new JsonContentRepository(catalogJson);
                var migrations = new SaveMigrationRegistry(1, new ISaveMigration[] { new InitialSaveMigration() });
                _saveStore = new AtomicFileSaveStore(Path.Combine(Application.persistentDataPath, "Profiles", "default"), new SaveEnvelopeCodec(migrations));
                var loaded = await _saveStore.LoadAsync();

                if (loaded.Status == SaveLoadStatus.FutureVersion)
                {
                    ShowFatal("This save was created by a newer game version. It has been preserved and will not be overwritten.");
                    return;
                }

                _lastSaveHash = loaded.ContentHash;
                _lastSavedRevision = loaded.Snapshot?.Revision ?? -1;
                var clock = new UnityClock();
                _session = new GameSession(clock, content, loaded.Snapshot);
                var offlineElapsed = loaded.Snapshot == null ? TimeSpan.Zero : _session.AdvanceOffline();
                _screen = new PrototypeScreen(gameObject, _session, _session, content.Current, offlineElapsed);
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
                ShowFatal("Startup failed: " + exception.Message);
            }
        }

        private void Update()
        {
            if (_session == null) return;
            if (_skipNextFrameAfterResume)
            {
                _skipNextFrameAfterResume = false;
                return;
            }
            _session.Update(Time.unscaledDeltaTime);
            _autosaveCountdown -= Time.unscaledDeltaTime;
            if (_autosaveCountdown <= 0f)
            {
                _autosaveCountdown = AutosaveIntervalSeconds;
                _ = SaveAsync();
            }
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused)
            {
                _wasBackgrounded = true;
                _ = SaveAsync();
            }
            else ResumeFromBackground();
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (!hasFocus)
            {
                _wasBackgrounded = true;
                _ = SaveAsync();
            }
            else ResumeFromBackground();
        }

        private void ResumeFromBackground()
        {
            if (!_wasBackgrounded || _session == null) return;
            _wasBackgrounded = false;
            _session.AdvanceOffline();
            _skipNextFrameAfterResume = true;
        }

        private void OnApplicationQuit()
        {
            if (_session != null && _saveStore != null && !_saveInProgress)
                _saveStore.SaveAsync(_session.ExportSnapshot(_lastSaveHash, _lastSavedRevision)).GetAwaiter().GetResult();
        }

        private void OnDestroy()
        {
            _screen?.Dispose();
        }

        private async Task SaveAsync()
        {
            if (_session == null || _saveStore == null || _saveInProgress) return;
            _saveInProgress = true;
            try
            {
                var snapshot = _session.ExportSnapshot(_lastSaveHash, _lastSavedRevision);
                var result = await _saveStore.SaveAsync(snapshot);
                _lastSaveHash = result.ContentHash;
                _lastSavedRevision = snapshot.Revision;
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
            }
            finally
            {
                _saveInProgress = false;
            }
        }

        private static async Task<string> LoadStreamingText(string relativePath)
        {
            var path = Path.Combine(Application.streamingAssetsPath, relativePath).Replace('\\', '/');
            if (!path.Contains("://")) path = new Uri(path).AbsoluteUri;
            using var request = UnityWebRequest.Get(path);
            var operation = request.SendWebRequest();
            while (!operation.isDone) await Task.Yield();
            if (request.result != UnityWebRequest.Result.Success)
                throw new IOException("Could not load content catalog: " + request.error);
            return request.downloadHandler.text;
        }

        private void ShowFatal(string message)
        {
            var panel = ScriptableObject.CreateInstance<PanelSettings>();
            panel.scaleMode = PanelScaleMode.ScaleWithScreenSize;
            panel.referenceResolution = new Vector2Int(1080, 1920);
            var document = gameObject.GetComponent<UIDocument>() ?? gameObject.AddComponent<UIDocument>();
            document.panelSettings = panel;
            var label = new Label(message);
            label.style.fontSize = 28;
            label.style.whiteSpace = WhiteSpace.Normal;
            label.style.paddingLeft = 40;
            label.style.paddingRight = 40;
            label.style.paddingTop = 80;
            label.style.color = Color.white;
            document.rootVisualElement.style.backgroundColor = new Color(0.15f, 0.02f, 0.02f, 1f);
            document.rootVisualElement.Add(label);
        }
    }
}
