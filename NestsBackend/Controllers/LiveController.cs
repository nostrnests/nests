using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace NestsBackend.Controllers;

/// <summary>
/// Live playlist (HLS) controller
/// </summary>
[Route("/api/v1/live")]
[AllowAnonymous]
public class LiveController(Config config) : Controller
{
    [HttpGet("{id:guid}/{filename}")]
    public IActionResult GetLivePlaylist([FromRoute] Guid id, [FromRoute] string filename)
    {
        var filePath = $"{config.ApiRecordingPath!}/live/{id}/{filename}";
        var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        return File(fs, "application/octet-stream");
    }
}