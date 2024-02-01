using LiveKit.Proto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nests.Database;
using NestsBackend.Model;
using NestsBackend.Services;
using Room = Nests.Database.Room;

namespace NestsBackend.Controllers;

[Route("/api/v1/nests")]
public class NestsController : Controller
{
    private readonly Config _config;
    private readonly NestsContext _db;
    private readonly LiveKitApi _liveKit;
    private readonly LiveKitJwt _liveKitJwt;

    public NestsController(Config config, NestsContext db, LiveKitApi liveKit, LiveKitJwt liveKitJwt)
    {
        _config = config;
        _db = db;
        _liveKit = liveKit;
        _liveKitJwt = liveKitJwt;
    }

    /// <summary>
    /// Create a new room
    /// </summary>
    /// <returns>Template nostr event with tags for streaming url and d-tag</returns>
    [HttpGet]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> CreateNewRoom()
    {
        var pubkey = HttpContext.GetPubKey();
        if (string.IsNullOrEmpty(pubkey)) return Unauthorized();

        var room = new Room
        {
            CreatedBy = pubkey
        };

        var user = new Participant
        {
            Pubkey = pubkey,
            IsAdmin = true,
            IsSpeaker = true,
            Room = room,
            RoomId = room.Id
        };

        _db.Rooms.Add(room);
        _db.Participants.Add(user);
        await _db.SaveChangesAsync();

        var liveKitEgress = new RoomEgress()
        {
            Room = new RoomCompositeEgressRequest()
            {
                RoomName = room.Id.ToString(),
                SegmentOutputs =
                {
                    new SegmentedFileOutput
                    {
                        Protocol = SegmentedFileProtocol.HlsProtocol,
                        FilenamePrefix = $"{room.Id}/r",
                        PlaylistName = "live.m3u8",
                        S3 = new S3Upload
                        {
                            Endpoint = _config.EgressS3.Endpoint.ToString(),
                            Bucket = _config.EgressS3.Bucket,
                            AccessKey = _config.EgressS3.Key,
                            Secret = _config.EgressS3.Secret
                        }
                    }
                }
            }
        };

        var liveKitReq = new CreateRoomRequest
        {
            Name = room.Id.ToString(),
            //Egress = liveKitEgress
        };

        await _liveKit.CreateRoom(liveKitReq);
        var token = _liveKitJwt.CreateToken(pubkey, new LiveKitJwt.Permissions()
        {
            Room = room.Id.ToString(),
            RoomJoin = true,
            RoomAdmin = user.IsAdmin,
            CanSubscribe = true,
            CanPublish = user.IsSpeaker,
            CanPublishSources = ["microphone"]
        });

        return Json(new CreateRoomResponse
        {
            RoomId = room.Id,
            Endpoints =
            {
                new Uri(_config.EgressS3.Endpoint, $"{room.Id}/live.m3u8"),
                new Uri(
                    $"{(_config.PublicUrl.Scheme == "http" ? "ws" : "wss")}+livekit://{_config.PublicUrl.Host}:{_config.PublicUrl.Port}")
            },
            Token = token
        });
    }

    [HttpGet("join/{id:guid}")]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> JoinRoom([FromRoute] Guid id)
    {
        var pubkey = HttpContext.GetPubKey();
        if (string.IsNullOrEmpty(pubkey)) return Unauthorized();

        var room = await _db.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (room == default)
        {
            return NotFound();
        }

        var participant = await _db.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.RoomId == room.Id && a.Pubkey == pubkey);

        if (participant == default)
        {
            participant = new Participant()
            {
                Pubkey = pubkey,
                RoomId = room.Id,
                IsAdmin = false,
                IsSpeaker = true
            };

            _db.Participants.Add(participant);
            await _db.SaveChangesAsync();
        }

        var token = _liveKitJwt.CreateToken(pubkey, new LiveKitJwt.Permissions()
        {
            Room = room.Id.ToString(),
            RoomJoin = true,
            RoomAdmin = participant.IsAdmin,
            CanSubscribe = true,
            CanPublish = participant.IsSpeaker,
            CanPublishSources = ["microphone"]
        });

        return Json(new {token});
    }
}
