using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nests.Database;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace NestsBackend.Controllers;

[Route("/api/v1/livekit")]
public class LiveKitController : Controller
{
    private readonly NestsContext _db;

    public LiveKitController(NestsContext db)
    {
        _db = db;
    }

    [HttpPost("webhook")]
    [Consumes("application/webhook+json")]
    public async Task<IActionResult> Webhook()
    {
        using var sr = new StreamReader(Request.Body);
        var json = await sr.ReadToEndAsync();

        var hook = JsonConvert.DeserializeObject<LiveKitWebhook>(json);
        if (hook == default) return BadRequest();

        if (hook.Event == "egress_ended" && hook.EgressInfo != default)
        {
            var recording = await _db.Recordings.FirstOrDefaultAsync(a =>
                a.EgressId == hook.EgressInfo.EgressId && a.RoomId == Guid.Parse(hook.EgressInfo.RoomName));
            if (recording != default)
            {
                recording.Stopped = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        return Ok();
    }

    public class LiveKitWebhook
    {
        [JsonProperty("id")]
        public string Id { get; init; } = null!;

        [JsonProperty("createdAt")]
        [JsonConverter(typeof(UnixDateTimeConverter))]
        public DateTime CreatedAt { get; init; }

        [JsonProperty("event")]
        public string Event { get; init; } = null!;

        [JsonProperty("egressInfo")]
        public EgressInfo? EgressInfo { get; init; }
    }

    public class EgressInfo
    {
        [JsonProperty("roomName")]
        public string RoomName { get; init; } = null!;

        [JsonProperty("egressId")]
        public string EgressId { get; init; } = null!;
    }
}