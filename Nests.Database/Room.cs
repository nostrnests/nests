using System.ComponentModel.DataAnnotations;

namespace Nests.Database;

public class Room
{
    public Guid Id { get; init; }  = Guid.NewGuid();

    [MaxLength(64)]
    public string CreatedBy { get; init; } = null!;

    /// <summary>
    /// Which relays are being used in the stream event
    /// </summary>
    public List<string> Relays { get; init; } = new();

    /// <summary>
    /// If we should output a HLS stream for the room
    /// </summary>
    public bool VideoStream { get; init; }
    
    /// <summary>
    /// Maximum capacity of the room
    /// </summary>
    public int Capacity { get; init; }
    
    public List<Participant> Participants { get; init; } = new();

    public List<Recording> Recordings { get; init; } = new();
}
