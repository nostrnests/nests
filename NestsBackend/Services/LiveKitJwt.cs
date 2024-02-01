using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NBitcoin;
using Newtonsoft.Json;

namespace NestsBackend.Services;

public class LiveKitJwt
{
    private readonly Config _config;
    
    public LiveKitJwt(Config config)
    {
        _config = config;
    }
    
    public string CreateToken(string pubkey, Permissions grant, int expireMinutes = 10)
    {
        var json = JsonConvert.SerializeObject(new
        {
            exp = DateTime.UtcNow.AddMinutes(expireMinutes).ToUnixTimestamp(),
            iss = _config.ApiKey,
            sub = pubkey,
            nbf = DateTime.UtcNow.ToUnixTimestamp(),
            video = grant
        });

        var token = new JsonWebTokenHandler().CreateToken(json,
            new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.ApiSecret)), "HS256"));

        return token;
    }

    public class Permissions
    {
        [JsonProperty("room")]
        public string? Room { get; init; }
        
        [JsonProperty("roomCreate")]
        public bool? RoomCreate { get; init; }
        
        [JsonProperty("roomList")]
        public bool? RoomList { get; init; }
        
        [JsonProperty("roomJoin")]
        public bool? RoomJoin { get; init; }
        
        [JsonProperty("roomAdmin")]
        public bool? RoomAdmin { get; init; }
        
        [JsonProperty("roomRecord")]
        public bool? RoomRecord { get; init; }
        
        [JsonProperty("ingressAdmin")]
        public bool? IngressAdmin { get; init; }
        
        [JsonProperty("canPublish")]
        public bool? CanPublish { get; init; }
        
        [JsonProperty("canPublishData")]
        public bool? CanPublishData { get; init; }
        
        [JsonProperty("canPublishSources")]
        public List<string>? CanPublishSources { get; init; }
        
        [JsonProperty("canSubscribe")]
        public bool? CanSubscribe { get; init; }
        
        [JsonProperty("canUpdateOwnMetadata")]
        public bool? CanUpdateOwnMetadata { get; init; }
        
        [JsonProperty("hidden")]
        public bool? Hidden { get; init; }
        
        [JsonProperty("recorder")]
        public bool? Recorder { get; init; }
    }
}
