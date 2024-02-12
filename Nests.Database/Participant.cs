using System.ComponentModel.DataAnnotations;

namespace Nests.Database;

public class Participant
{
    public Guid Id { get; init; } = Guid.NewGuid();

    [MaxLength(64)]
    public string Pubkey { get; init; } = null!;

    public Guid RoomId { get; init; }
    public Room Room { get; set; } = null!;

    /// <summary>
    /// User can moderate the room
    /// </summary>
    public bool IsAdmin { get; set; } = true;

    /// <summary>
    /// User can publish audio (speak)
    /// </summary>
    public bool IsSpeaker { get; set; }
}
