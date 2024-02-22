using LiveKit.Proto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nests.Database;
using NestsBackend.Model;
using NestsBackend.Services;
using Nostr.Client.Identifiers;
using Nostr.Client.Messages;
using Room = Nests.Database.Room;

namespace NestsBackend.Controllers;

[Route("/api/v1/nests")]
[Consumes("application/json")]
[Produces("application/json")]
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
    public async Task<IActionResult> CreateNewRoom([FromQuery] string[] relay)
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

        var naddr = new NostrAddressIdentifier(room.Id.ToString(), pubkey, relay, NostrKind.LiveEvent);
        var liveKitReq = new CreateRoomRequest
        {
            Name = room.Id.ToString(),
            Egress = new()
            {
                Room = new()
                {
                    RoomName = room.Id.ToString(),
                    CustomBaseUrl = new Uri(_config.PublicNestsUrl, $"/{naddr.ToBech32()}").ToString(),
                    SegmentOutputs =
                    {
                        new SegmentedFileOutput()
                        {
                            Protocol = SegmentedFileProtocol.HlsProtocol,
                            FilenamePrefix = $"{_config.EgressRecordingPath!}/live/{room.Id}/seg",
                            LivePlaylistName = "live.m3u8"
                        }
                    }
                }
            }
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
                new Uri(_config.PublicUrl, $"api/v1/live/{room.Id}/live.m3u8"),
                new Uri(
                    $"{(_config.PublicUrl.Scheme == "http" ? "ws" : "wss")}+livekit://{_config.PublicUrl.Host}:{_config.PublicUrl.Port}")
            },
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
        var room = await _db.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (room == default)
        {
            return NotFound();
        }

        var guid = $"guest-{Guid.NewGuid()}";
        var token = _liveKitJwt.CreateToken(guid, new LiveKitJwt.Permissions()
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
                IsSpeaker = false
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

        var room = await _db.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (room == default)
        {
            return NotFound();
        }

        var participant = await _db.Participants
            .FirstOrDefaultAsync(a => a.RoomId == room.Id && a.Pubkey == req.Participant);

        if (participant == default)
        {
            return BadRequest();
        }

        var callerParticipant = await _db.Participants
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
            var roomParticipant = await _liveKit.GetParticipant(new()
            {
                Room = room.Id.ToString(),
                Identity = participant.Pubkey
            });
            var micTrack = roomParticipant.Tracks.FirstOrDefault(a => a.Source == TrackSource.Microphone);
            if (micTrack != default)
            {
                await _liveKit.MutePublishedTrack(new()
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
            await _db.SaveChangesAsync();
            try
            {
                await _liveKit.UpdateParticipant(new()
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

        if (_config.EgressRecordingPath == default)
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
                    Filepath = $"{_config.EgressRecordingPath}/{recordingId}"
                }
            }
        };

        var rsp = await _liveKit.StartRoomCompositeEgress(req);
        if (rsp.Status is EgressStatus.EgressStarting)
        {
            var newRecording = new Recording()
            {
                Id = recordingId,
                RoomId = room.Id,
                StartedBy = user.Pubkey,
                EgressId = rsp.EgressId
            };
            _db.Recordings.Add(newRecording);
            await _db.SaveChangesAsync();
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
        var recording = await _db.Recordings
            .FirstOrDefaultAsync(a => a.Id == id && a.RoomId == roomId);
        if (recording == default)
        {
            return NotFound();
        }

        if (recording.Stopped.HasValue)
        {
            return BadRequest(new NestError("Already stopped"));
        }

        await _liveKit.StopEgress(recording.RoomId, new()
        {
            EgressId = recording.EgressId
        });
        recording.Stopped = DateTime.UtcNow;
        await _db.SaveChangesAsync();

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
            Url = new Uri(_config.PublicUrl, $"/api/v1/nests/{room.Id}/recording/{a.Id}")
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

        var recording = await _db.Recordings
            .FirstOrDefaultAsync(a => a.Id == id && a.RoomId == roomId);
        if (recording == default)
        {
            return NotFound();
        }

        if (!recording.Stopped.HasValue)
        {
            return BadRequest(new NestError("Recording not finished"));
        }

        var path = Path.Combine(_config.ApiRecordingPath!, $"{recording.Id}.mp4");
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

        var recording = await _db.Recordings
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && a.RoomId == roomId);
        if (recording == default)
        {
            return NotFound();
        }

        var path = Path.Combine(_config.ApiRecordingPath!, $"{recording.Id}.mp4");
        if (Path.Exists(path))
        {
            System.IO.File.Delete(path);
            await _db.Recordings
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

        var room = await _db.Rooms
            .AsNoTracking()
            .Include(a => a.Recordings)
            .FirstOrDefaultAsync(a => a.Id == roomId);

        if (room == default)
        {
            return default;
        }

        var user = await _db.Participants
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
        var room = await _db.Rooms
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
            Link = new NostrAddressIdentifier(room.Id.ToString(), room.CreatedBy, null, (NostrKind)30312).ToBech32(),
            Recording = room.Recordings.Any(a => a.Stopped == null)
        };
    }

    private async Task UpdateRoomInfo(Guid roomId)
    {
        var info = await GetRoomInfoObject(roomId);
        if (info == default) return;

        await _liveKit.UpdateRoomMetadata(roomId, info);
    }
}