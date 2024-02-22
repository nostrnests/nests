namespace NestsBackend;

public class Config
{
    /// <summary>
    /// Public facing hostname of the system
    /// </summary>
    public Uri PublicUrl { get; init; } = null!;

    public string ApiKey { get; init; } = null!;

    public string ApiSecret { get; init; } = null!;

    /// <summary>
    /// LiveKit API endpoint
    /// </summary>
    public Uri LiveKitApi { get; init; } = null!;
    
    /// <summary>
    /// Path to save recording on disk (egress path)
    /// </summary>
    public string? EgressRecordingPath { get; init; }
    
    /// <summary>
    /// Local path which mounts <see cref="EgressRecordingPath"/>
    /// </summary>
    public string? ApiRecordingPath { get; init; }
}