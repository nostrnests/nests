using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NBitcoin;
using Newtonsoft.Json;

namespace NestsBackend.Controllers;

[Route("/api/v1/nests")]
public class NestsController : Controller
{
    private readonly Config _config;

    public NestsController(Config config)
    {
        _config = config;
    }

    [HttpPut]
    [Authorize(AuthenticationSchemes = NostrAuth.Scheme)]
    public IActionResult CreateRoom([FromQuery] string room)
    {
        var pubkey = HttpContext.GetPubKey();
        if (string.IsNullOrEmpty(pubkey)) return Unauthorized();

        var json = JsonConvert.SerializeObject(new
        {
            exp = DateTime.UtcNow.AddHours(6).ToUnixTimestamp(),
            iss = _config.ApiKey,
            sub = pubkey,
            nbf = DateTime.UtcNow.ToUnixTimestamp(),
            video = new
            {
                room,
                roomCreate = true,
                roomJoin = true,
                canPublish = true,
                canSubscribe = true,
                canPublishSources = new[] {"microphone"}
            }
        });

        var token = new JsonWebTokenHandler().CreateToken(json,
            new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.ApiSecret)), "HS256"));

        return Json(new {token});
    }
}