using Newtonsoft.Json;

namespace NestsBackend.Model;

public class RoomInfoResponse
{
    [JsonProperty("host")]
    public string Host { get; init; } = null!;
    
    [JsonProperty("speakers")]
    public List<string> Speakers { get; init; } = new();
    
    [JsonProperty("admins")]
    public List<string> Admins { get; init; } = new();
    
    [JsonProperty("link")]
    public string Link { get; init; } = null!;
    
    [JsonProperty("recording")]
    public bool Recording { get; init; }
}