using System.Net.Http.Headers;
using Google.Protobuf;
using LiveKit.Proto;
using Newtonsoft.Json;

namespace NestsBackend.Services;

public class LiveKitApi
{
    private readonly HttpClient _client;
    private readonly ILogger<LiveKitApi> _logger;
    private readonly Config _config;
    private readonly LiveKitJwt _jwt;

    public LiveKitApi(HttpClient client, ILogger<LiveKitApi> logger, Config config, LiveKitJwt jwt)
    {
        _client = client;
        _logger = logger;
        _config = config;
        _jwt = jwt;

        _client.BaseAddress = _config.LiveKitApi;
    }

    public async Task<Room> CreateRoom(CreateRoomRequest req)
    {
        var token = _jwt.CreateToken("backend",
            new LiveKitJwt.Permissions
            {
                RoomCreate = true,
            });

        return await TwirpRpc<CreateRoomRequest, Room>(token, "livekit.RoomService", "CreateRoom", req);
    }

    public async Task<Room> UpdateParticipant(UpdateParticipantRequest req)
    {
        var token = _jwt.CreateToken("backend",
            new LiveKitJwt.Permissions
            {
                Room = req.Room,
                RoomAdmin = true,
            });

        return await TwirpRpc<UpdateParticipantRequest, Room>(token, "livekit.RoomService", "UpdateParticipant", req);
    }

    public async Task<ParticipantInfo> GetParticipant(RoomParticipantIdentity req)
    {
        var token = _jwt.CreateToken("backend",
            new LiveKitJwt.Permissions
            {
                Room = req.Room,
                RoomAdmin = true,
            });

        return await TwirpRpc<RoomParticipantIdentity, ParticipantInfo>(token, "livekit.RoomService", "GetParticipant",
            req);
    }

    public async Task MutePublishedTrack(MuteRoomTrackRequest req)
    {
        var token = _jwt.CreateToken("backend",
            new LiveKitJwt.Permissions
            {
                Room = req.Room,
                RoomAdmin = true,
            });

        await TwirpRpc<MuteRoomTrackRequest, Room>(token, "livekit.RoomService", "MutePublishedTrack", req);
    }

    private async Task<TR> TwirpRpc<T, TR>(string token, string service, string method, T req)
        where T : IMessage where TR : IMessage, new()
    {
        var twirpReq = new HttpRequestMessage(HttpMethod.Post, $"/twirp/{service}/{method}");
        using var stream = new MemoryStream();
        req.WriteTo(stream);
        stream.Seek(0, SeekOrigin.Begin);

        twirpReq.Content = new ByteArrayContent(stream.ToArray())
        {
            Headers = { ContentType = new MediaTypeHeaderValue("application/protobuf") }
        };

        twirpReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);


        var rsp = await _client.SendAsync(twirpReq);
        if (rsp.IsSuccessStatusCode)
        {
            var ret = new TR();
            ret.MergeFrom(await rsp.Content.ReadAsStreamAsync());
            return ret;
        }

        var err = JsonConvert.DeserializeObject<TwirpError>(await rsp.Content.ReadAsStringAsync());
        throw new Exception(err?.Code ?? "Unknown error");
    }

    class TwirpError
    {
        [JsonProperty("code")] public string Code { get; init; } = null!;

        [JsonProperty("msg")] public string? Message { get; init; }

        [JsonProperty("meta")] public object? Meta { get; init; }
    }
}