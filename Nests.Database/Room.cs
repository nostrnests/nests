using System.ComponentModel.DataAnnotations;

namespace Nests.Database;

public class Room
{
    public Guid Id { get; init; }  = Guid.NewGuid();

    [MaxLength(64)]
    public string CreatedBy { get; init; } = null!;
    
    public List<Participant> Participants { get; init; } = new();
}
