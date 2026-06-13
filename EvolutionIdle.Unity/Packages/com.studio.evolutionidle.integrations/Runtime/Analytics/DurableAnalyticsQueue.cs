using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EvolutionIdle.Core.Abstractions;
using Newtonsoft.Json;

namespace EvolutionIdle.Integrations.Analytics
{
    public interface IAnalyticsTransport
    {
        Task SendAsync(IReadOnlyList<AnalyticsEvent> events, CancellationToken cancellationToken);
    }

    public sealed class DurableAnalyticsQueue : IAnalyticsSink
    {
        private readonly string _path;
        private readonly int _capacity;
        private readonly IAnalyticsTransport _transport;
        private readonly List<AnalyticsEvent> _queue;
        private readonly object _gate = new object();

        public bool ConsentGranted { get; set; }

        public DurableAnalyticsQueue(string path, int capacity, IAnalyticsTransport transport)
        {
            _path = path ?? throw new ArgumentNullException(nameof(path));
            _capacity = Math.Max(1, capacity);
            _transport = transport ?? throw new ArgumentNullException(nameof(transport));
            var loaded = Load(path).ToList();
            _queue = loaded.Skip(Math.Max(0, loaded.Count - _capacity)).ToList();
        }

        public void Enqueue(AnalyticsEvent analyticsEvent)
        {
            if (!ConsentGranted || analyticsEvent == null) return;
            lock (_gate)
            {
                _queue.Add(analyticsEvent);
                if (_queue.Count > _capacity) _queue.RemoveRange(0, _queue.Count - _capacity);
                Persist();
            }
        }

        public async Task FlushAsync(CancellationToken cancellationToken = default)
        {
            if (!ConsentGranted) return;
            AnalyticsEvent[] batch;
            lock (_gate) batch = _queue.ToArray();
            if (batch.Length == 0) return;

            await _transport.SendAsync(batch, cancellationToken);
            lock (_gate)
            {
                _queue.RemoveRange(0, Math.Min(batch.Length, _queue.Count));
                Persist();
            }
        }

        private static IEnumerable<AnalyticsEvent> Load(string path)
        {
            if (!File.Exists(path)) return Array.Empty<AnalyticsEvent>();
            try
            {
                return JsonConvert.DeserializeObject<List<AnalyticsEvent>>(File.ReadAllText(path)) ?? new List<AnalyticsEvent>();
            }
            catch (JsonException)
            {
                return Array.Empty<AnalyticsEvent>();
            }
        }

        private void Persist()
        {
            var directory = Path.GetDirectoryName(_path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            var temporary = _path + ".tmp";
            File.WriteAllText(temporary, JsonConvert.SerializeObject(_queue));
            if (File.Exists(_path)) File.Replace(temporary, _path, null, true);
            else File.Move(temporary, _path);
        }
    }

    public sealed class NullAnalyticsTransport : IAnalyticsTransport
    {
        public Task SendAsync(IReadOnlyList<AnalyticsEvent> events, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
