using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace NestsBackend.Model;

public class RoomRecording
{
    [JsonProperty("id")]
    public Guid Id { get; init; }

    [JsonProperty("started")]
    [JsonConverter(typeof(UnixDateTimeConverter))]
    public DateTime Started { get; init; }

    [JsonProperty("stopped")]
    [JsonConverter(typeof(UnixDateTimeConverter))]
    public DateTime? Stopped { get; init; }

    [JsonProperty("url")]
    public Uri Url { get; init; } = null!;
}