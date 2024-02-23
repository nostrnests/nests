using LiveKit.Proto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nests.Database;
using NestsBackend.Services;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Nostr.Client.Identifiers;
using Nostr.Client.Messages;

namespace NestsBackend.Controllers;

[Route("/api/v1/livekit")]
[AllowAnonymous]
public class LiveKitController(NestsContext db, Config config, LiveKitApi api) : Controller
{
    [HttpPost("webhook")]
    [Consumes("application/webhook+json")]
    public async Task<IActionResult> Webhook()
    {
        using var sr = new StreamReader(Request.Body);
        var json = await sr.ReadToEndAsync();

        var hook = JsonConvert.DeserializeObject<LiveKitWebhook>(json);
        if (hook == default) return BadRequest();

        if (hook is { Event: "egress_ended", EgressInfo: not null })
        {
            var recording = await db.Recordings.FirstOrDefaultAsync(a =>
                a.EgressId == hook.EgressInfo.EgressId && a.RoomId == Guid.Parse(hook.EgressInfo.RoomName));
            if (recording != default)
            {
                recording.Stopped = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
        }
        else if (hook is { Event: "room_started", Room: not null })
        {
            var room = await db.Rooms.SingleOrDefaultAsync(a => a.Id == Guid.Parse(hook.Room.Name));
            if (room is { VideoStream: true, Relays.Count: > 0 })
            {
                var naddr = new NostrAddressIdentifier(room.Id.ToString(), room.CreatedBy, room.Relays.ToArray(),
                    NostrKind.LiveEvent);
                var egress = new RoomCompositeEgressRequest
                {
                    RoomName = room.Id.ToString(),
                    CustomBaseUrl = new Uri(config.PublicNestsUrl, $"/{naddr.ToBech32()}").ToString(),
                    SegmentOutputs =
                    {
                        new SegmentedFileOutput
                        {
                            Protocol = SegmentedFileProtocol.HlsProtocol,
                            FilenamePrefix = $"{config.EgressRecordingPath!}/live/{room.Id}/seg",
                            LivePlaylistName = "live.m3u8"
                        }
                    }
                };

                await api.StartRoomCompositeEgress(egress);
            }
        }

        return Ok();
    }

    class LiveKitWebhook
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

        [JsonProperty("room")]
        public RoomInfo? Room { get; init; }
    }

    class EgressInfo
    {
        [JsonProperty("roomName")]
        public string RoomName { get; init; } = null!;

        [JsonProperty("egressId")]
        public string EgressId { get; init; } = null!;
    }

    class RoomInfo
    {
        [JsonProperty("name")]
        public string Name { get; init; }
    }
}