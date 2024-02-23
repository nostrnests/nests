using Newtonsoft.Json;

namespace NestsBackend.Model;

public class CreateRoomRequest
{
    [JsonProperty("relays")]
    public List<string> Relays { get; init; } = new();
    
    [JsonProperty("hls_stream")]
    public bool HlsStream { get; init; }
}