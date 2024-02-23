using LiveKit.Proto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nests.Database;
using NestsBackend.Model;
using NestsBackend.Services;
using Newtonsoft.Json;
using Nostr.Client.Identifiers;
using Nostr.Client.Messages;
using CreateRoomRequest = NestsBackend.Model.CreateRoomRequest;
using Room = Nests.Database.Room;

namespace NestsBackend.Controllers;

[Route("/api/v1/nests")]
[Consumes("application/json")]
[Produces("application/json")]
public class NestsController(Config config, NestsContext db, LiveKitApi liveKit, LiveKitJwt liveKitJwt)
    : Controller
{
    /// <summary>
    /// Create a new room
    /// </summary>
    /// <returns>Template nostr event with tags for streaming url and d-tag</returns>
    [HttpPut]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> CreateNewRoom([FromBody] CreateRoomRequest req)
    {
        var pubkey = HttpContext.GetPubKey();
        if (string.IsNullOrEmpty(pubkey)) return Unauthorized();

        const int maxParticipants = 50;
        var room = new Room
        {
            CreatedBy = pubkey,
            Relays = req.Relays,
            VideoStream = req.HlsStream,
            Capacity = maxParticipants
        };

        var user = new Participant
        {
            Pubkey = pubkey,
            IsAdmin = true,
            IsSpeaker = true,
            Room = room,
            RoomId = room.Id
        };

        db.Rooms.Add(room);
        db.Participants.Add(user);
        await db.SaveChangesAsync();

        var liveKitReq = new LiveKit.Proto.CreateRoomRequest
        {
            Name = room.Id.ToString(),
            MaxParticipants = maxParticipants,
            EmptyTimeout = (uint)TimeSpan.FromMinutes(3).TotalSeconds,
            Metadata = JsonConvert.SerializeObject(await GetRoomInfoObject(room.Id))
        };

        await liveKit.CreateRoom(liveKitReq);
        var token = liveKitJwt.CreateToken(pubkey, new LiveKitJwt.Permissions()
        {
            Room = room.Id.ToString(),
            RoomJoin = true,
            RoomAdmin = user.IsAdmin,
            CanSubscribe = true,
            CanPublish = user.IsSpeaker,
            CanPublishSources = ["microphone"]
        });

        var endpoints = new List<Uri>(
        [
            new Uri(
                $"{(config.PublicUrl.Scheme == "http" ? "ws" : "wss")}+livekit://{config.PublicUrl.Host}:{config.PublicUrl.Port}")
        ]);
        if (req.HlsStream)
        {
            endpoints.Add(new Uri(config.PublicUrl, $"api/v1/live/{room.Id}/live.m3u8"));
        }

        return Json(new CreateRoomResponse
        {
            RoomId = room.Id,
            Endpoints = endpoints,
            Token = token
        });
    }

    /// <summary>
    /// Join room as guest (no nostr key)
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpGet("{id:guid}/guest")]
    [AllowAnonymous]
    public async Task<IActionResult> GuestJoinRoom([FromRoute] Guid id)
    {
        var room = await db.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (room == default)
        {
            return NotFound();
        }

        var guid = $"guest-{Guid.NewGuid()}";
        var token = liveKitJwt.CreateToken(guid, new LiveKitJwt.Permissions()
        {
            Room = room.Id.ToString(),
            RoomJoin = true,
            CanSubscribe = true,
            CanPublish = false
        });

        return Json(new { token });
    }

    /// <summary>
    /// Join room as nostr user
    /// </summary>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpGet("{id:guid}")]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> JoinRoom([FromRoute] Guid id)
    {
        var pubkey = HttpContext.GetPubKey();
        if (string.IsNullOrEmpty(pubkey)) return Unauthorized();

        var room = await db.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (room == default)
        {
            return NotFound();
        }

        var participant = await db.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.RoomId == room.Id && a.Pubkey == pubkey);

        if (participant == default)
        {
            participant = new Participant()
            {
                Pubkey = pubkey,
                RoomId = room.Id,
                IsAdmin = false,
                IsSpeaker = false
            };

            db.Participants.Add(participant);
            await db.SaveChangesAsync();
        }

        var token = liveKitJwt.CreateToken(pubkey, new LiveKitJwt.Permissions()
        {
            Room = room.Id.ToString(),
            RoomJoin = true,
            RoomAdmin = participant.IsAdmin,
            CanSubscribe = true,
            CanPublish = participant.IsSpeaker,
            CanPublishSources = ["microphone"]
        });

        return Json(new { token });
    }

    /// <summary>
    /// Edit a users permissions
    /// </summary>
    /// <param name="id"></param>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost("{id:guid}/permissions")]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> ChangePermissions([FromRoute] Guid id, [FromBody] ChangePermissionsRequest req)
    {
        var pubkey = HttpContext.GetPubKey();
        if (string.IsNullOrEmpty(pubkey)) return Unauthorized();

        var room = await db.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (room == default)
        {
            return NotFound();
        }

        var participant = await db.Participants
            .FirstOrDefaultAsync(a => a.RoomId == room.Id && a.Pubkey == req.Participant);

        if (participant == default)
        {
            return BadRequest();
        }

        var callerParticipant = await db.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.RoomId == room.Id && a.Pubkey == pubkey);

        if (callerParticipant == default)
        {
            return BadRequest();
        }

        var isAllowedEditSelf = callerParticipant.Pubkey == participant.Pubkey && req.CanPublish == false;
        var isHost = callerParticipant.Pubkey == room.CreatedBy;
        if (!(callerParticipant.IsAdmin || isAllowedEditSelf))
        {
            return Unauthorized();
        }

        var changes = false;
        if (req.CanPublish.HasValue)
        {
            participant.IsSpeaker = req.CanPublish.Value;
            changes = true;
        }

        if (req.IsAdmin.HasValue && isHost)
        {
            participant.IsAdmin = req.IsAdmin.Value;
            await UpdateRoomInfo(room.Id);
            changes = true;
        }

        if (req.MuteMicrophone.HasValue)
        {
            var roomParticipant = await liveKit.GetParticipant(new()
            {
                Room = room.Id.ToString(),
                Identity = participant.Pubkey
            });
            var micTrack = roomParticipant.Tracks.FirstOrDefault(a => a.Source == TrackSource.Microphone);
            if (micTrack != default)
            {
                await liveKit.MutePublishedTrack(new()
                {
                    Room = room.Id.ToString(),
                    Identity = participant.Pubkey,
                    Muted = req.MuteMicrophone.Value,
                    TrackSid = micTrack.Sid
                });
                changes = true;
            }
        }

        if (changes)
        {
            await db.SaveChangesAsync();
            try
            {
                await liveKit.UpdateParticipant(new()
                {
                    Room = room.Id.ToString(),
                    Identity = participant.Pubkey,
                    Permission = new()
                    {
                        CanPublish = participant.IsSpeaker,
                        CanSubscribe = true
                    }
                });
            }
            finally
            {
                await UpdateRoomInfo(room.Id);
            }

            return Accepted();
        }

        return NoContent();
    }

    [HttpGet("{id:guid}/info")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRoomInfo([FromRoute] Guid id)
    {
        var ret = await GetRoomInfoObject(id);

        if (ret == default)
        {
            return NotFound();
        }

        return Json(ret);
    }

    /// <summary>
    /// Start a new recording
    /// </summary>
    /// <param name="roomId"></param>
    /// <returns></returns>
    [HttpPost("{roomId:guid}/recording")]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> StartRecording([FromRoute] Guid roomId)
    {
        var roomInfo = await GetAdminUserAndRoom(roomId);
        if (roomInfo == default)
        {
            return BadRequest();
        }

        var (room, user) = roomInfo.Value;
        var recordingId = Guid.NewGuid();

        if (config.EgressRecordingPath == default)
        {
            throw new Exception("Recording path not configured");
        }

        var req = new RoomCompositeEgressRequest
        {
            AudioOnly = true,
            RoomName = roomId.ToString(),
            FileOutputs =
            {
                new EncodedFileOutput
                {
                    FileType = EncodedFileType.Mp4,
                    Filepath = $"{config.EgressRecordingPath}/{recordingId}"
                }
            }
        };

        var rsp = await liveKit.StartRoomCompositeEgress(req);
        if (rsp.Status is EgressStatus.EgressStarting)
        {
            var newRecording = new Recording()
            {
                Id = recordingId,
                RoomId = room.Id,
                StartedBy = user.Pubkey,
                EgressId = rsp.EgressId
            };
            db.Recordings.Add(newRecording);
            await db.SaveChangesAsync();
            await UpdateRoomInfo(roomId);
            return Accepted();
        }

        return BadRequest();
    }

    /// <summary>
    /// Stop a recording
    /// </summary>
    /// <param name="roomId"></param>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpPatch("{roomId:guid}/recording/{id:guid}")]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> StopRecording([FromRoute] Guid roomId, [FromRoute] Guid id)
    {
        var roomInfo = await GetAdminUserAndRoom(roomId);
        if (roomInfo == default)
        {
            return BadRequest();
        }

        var (room, _) = roomInfo.Value;
        var recording = await db.Recordings
            .FirstOrDefaultAsync(a => a.Id == id && a.RoomId == roomId);
        if (recording == default)
        {
            return NotFound();
        }

        if (recording.Stopped.HasValue)
        {
            return BadRequest(new NestError("Already stopped"));
        }

        await liveKit.StopEgress(recording.RoomId, new()
        {
            EgressId = recording.EgressId
        });
        recording.Stopped = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await UpdateRoomInfo(roomId);

        return Accepted();
    }

    [HttpGet("{roomId:guid}/recording")]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> ListRecordings([FromRoute] Guid roomId)
    {
        var roomInfo = await GetAdminUserAndRoom(roomId);
        if (roomInfo == default)
        {
            return BadRequest();
        }

        var (room, _) = roomInfo.Value;
        return Json(room.Recordings.Select(a => new RoomRecording()
        {
            Id = a.Id,
            Started = a.Started,
            Stopped = a.Stopped,
            Url = new Uri(config.PublicUrl, $"/api/v1/nests/{room.Id}/recording/{a.Id}")
        }));
    }

    [HttpGet("{roomId:guid}/recording/{id:guid}")]
    public async Task<IActionResult> GetRecording([FromRoute] Guid roomId, [FromRoute] Guid id)
    {
        var roomInfo = await GetAdminUserAndRoom(roomId);
        if (roomInfo == default)
        {
            return BadRequest();
        }

        var recording = await db.Recordings
            .FirstOrDefaultAsync(a => a.Id == id && a.RoomId == roomId);
        if (recording == default)
        {
            return NotFound();
        }

        if (!recording.Stopped.HasValue)
        {
            return BadRequest(new NestError("Recording not finished"));
        }

        var path = Path.Combine(config.ApiRecordingPath!, $"{recording.Id}.mp4");
        if (Path.Exists(path))
        {
            var fs = new FileStream(path, FileMode.Open,
                FileAccess.Read);
            return File(fs, "audio/mp4");
        }

        return NotFound();
    }

    /// <summary>
    /// Delete a recording for a room
    /// </summary>
    /// <param name="roomId"></param>
    /// <param name="id"></param>
    /// <returns></returns>
    [HttpDelete("{roomId:guid}/recording/{id:guid}")]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public async Task<IActionResult> DeleteRecording([FromRoute] Guid roomId, [FromRoute] Guid id)
    {
        var roomInfo = await GetAdminUserAndRoom(roomId);
        if (roomInfo == default)
        {
            return BadRequest();
        }

        var recording = await db.Recordings
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && a.RoomId == roomId);
        if (recording == default)
        {
            return NotFound();
        }

        var path = Path.Combine(config.ApiRecordingPath!, $"{recording.Id}.mp4");
        if (Path.Exists(path))
        {
            System.IO.File.Delete(path);
            await db.Recordings
                .Where(a => a.Id == recording.Id)
                .ExecuteDeleteAsync();
            return Accepted();
        }

        return NotFound();
    }

    private async Task<(Room, Participant)?> GetAdminUserAndRoom(Guid roomId)
    {
        var pubkey = HttpContext.GetPubKey();
        if (string.IsNullOrEmpty(pubkey)) return default;

        var room = await db.Rooms
            .AsNoTracking()
            .Include(a => a.Recordings)
            .FirstOrDefaultAsync(a => a.Id == roomId);

        if (room == default)
        {
            return default;
        }

        var user = await db.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Pubkey == pubkey && a.RoomId == room.Id);

        if (user == default)
        {
            return default;
        }

        if (!user.IsAdmin)
        {
            return default;
        }

        return (room, user);
    }

    private async Task<RoomInfoResponse?> GetRoomInfoObject(Guid roomId)
    {
        var room = await db.Rooms
            .AsNoTracking()
            .Include(a => a.Participants)
            .Include(a => a.Recordings)
            .FirstOrDefaultAsync(a => a.Id == roomId);

        if (room == default)
        {
            return default;
        }

        return new RoomInfoResponse
        {
            Host = room.CreatedBy,
            Speakers = room.Participants.Where(a => a.IsSpeaker).Select(a => a.Pubkey).ToList(),
            Admins = room.Participants.Where(a => a.IsAdmin).Select(a => a.Pubkey).ToList(),
            Link = new NostrAddressIdentifier(room.Id.ToString(), room.CreatedBy, null, NostrKind.LiveEvent).ToBech32(),
            Recording = room.Recordings.Any(a => a.Stopped == null)
        };
    }

    private async Task UpdateRoomInfo(Guid roomId)
    {
        var info = await GetRoomInfoObject(roomId);
        if (info == default) return;

        await liveKit.UpdateRoomMetadata(roomId, info);
    }
}