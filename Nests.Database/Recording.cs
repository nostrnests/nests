using System.ComponentModel.DataAnnotations;

namespace Nests.Database;

public class Recording
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid RoomId { get; init; }
    public Room Room { get; set; } = null!;

    [MaxLength(64)] 
    public string StartedBy { get; init; } = null!;

    public DateTime Started { get; init; } = DateTime.UtcNow;
    
    public DateTime? Stopped { get; set; } 
    
    public string EgressId { get; init; } = null!;
}