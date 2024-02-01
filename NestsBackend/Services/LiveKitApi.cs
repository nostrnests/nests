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
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _jwt.CreateToken("backend",
            new LiveKitJwt.Permissions()
            {
                RoomCreate = true,
                IngressAdmin = true,
                RoomList = true,
                RoomAdmin = true,
                Hidden = true,
                RoomRecord = true
            }, (int)TimeSpan.FromDays(365).TotalMinutes));
    }

    public async Task<Room> CreateRoom(CreateRoomRequest req)
    {
        return await TwirpRpc<CreateRoomRequest, Room>("livekit.RoomService", "CreateRoom", req);
    }

    private async Task<R> TwirpRpc<T, R>(string service, string method, T req) where T : IMessage where R : IMessage, new()
    {
        var twirpReq = new HttpRequestMessage(HttpMethod.Post, $"/twirp/{service}/{method}");
        using var stream = new MemoryStream();
        req.WriteTo(stream);
        stream.Seek(0, SeekOrigin.Begin);

        twirpReq.Content = new ByteArrayContent(stream.ToArray())
        {
            Headers = {ContentType = new MediaTypeHeaderValue("application/protobuf")}
        };


        var rsp = await _client.SendAsync(twirpReq);
        if (rsp.IsSuccessStatusCode)
        {
            var ret = new R();
            ret.MergeFrom(await rsp.Content.ReadAsStreamAsync());
            return ret;
        }

        var err = JsonConvert.DeserializeObject<TwirpError>(await rsp.Content.ReadAsStringAsync());
        throw new Exception(err?.Code ?? "Unknown error");
    }

    class TwirpError
    {
        [JsonProperty("code")]
        public string Code { get; init; } = null!;

        [JsonProperty("msg")]
        public string? Message { get; init; }

        [JsonProperty("meta")]
        public object? Meta { get; init; }
    }
}
