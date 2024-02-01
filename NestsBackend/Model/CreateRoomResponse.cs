using Newtonsoft.Json;

namespace NestsBackend.Model;

public class CreateRoomResponse
{
    /// <summary>
    /// Room ID 
    /// </summary>
    [JsonProperty("roomId")]
    public Guid RoomId { get; init; }

    /// <summary>
    /// List of streaming endpoints (LiveKit/HLS)
    /// </summary>
    [JsonProperty("endpoints")]
    public List<Uri> Endpoints { get; init; } = new();

    /// <summary>
    /// Token for user to join LiveKit room
    /// </summary>
    public string Token { get; init; } = null!;
}
