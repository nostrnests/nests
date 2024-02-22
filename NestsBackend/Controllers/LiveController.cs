using Microsoft.AspNetCore.Mvc;

namespace NestsBackend.Controllers;

/// <summary>
/// Live playlist (HLS) controller
/// </summary>
[Route("/api/v1/live")]
public class LiveController : Controller
{
    private readonly Config _config;

    public LiveController(Config config)
    {
        _config = config;
    }

    [HttpGet("{id:guid}/{filename}")]
    public IActionResult GetLivePlaylist([FromRoute] Guid id, [FromRoute] string filename)
    {
        var filePath = $"{_config.ApiRecordingPath!}/live/{id}/{filename}";
        var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        return File(fs, "application/octet-stream");
    }
}