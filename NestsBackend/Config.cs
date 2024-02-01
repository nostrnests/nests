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
    /// S3 hosts where egress HLS recordings are saved
    /// </summary>
    public S3 EgressS3 { get; init; } = null!;
}

public class S3
{
    public Uri Endpoint { get; init; } = null!;
    public string Bucket { get; init; } = null!;
    public string Key { get; init; } = null!;
    public string Secret { get; init; } = null!;
}
