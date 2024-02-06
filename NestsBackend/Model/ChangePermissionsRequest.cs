using Newtonsoft.Json;

namespace NestsBackend.Model;

public class ChangePermissionsRequest
{
    [JsonProperty("participant")]
    public string Participant { get; init; } = null!;

    [JsonProperty("can_publish")]
    public bool CanPublish { get; init; }
}
