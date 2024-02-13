using Newtonsoft.Json;

namespace NestsBackend.Model;

public class NestError
{
    public NestError(string msg)
    {
        Message = msg;
    }

    public NestError()
    {
    }

    [JsonProperty("message")]
    public string Message { get; init; } = null!;

    [JsonProperty("error")]
    public bool Error => true;
}