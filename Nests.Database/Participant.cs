using System.ComponentModel.DataAnnotations;

namespace Nests.Database;

public class Participant
{
    public Guid Id { get; init; } = Guid.NewGuid();

    [MaxLength(64)]
    public string Pubkey { get; init; } = null!;

    public Guid RoomId { get; init; }
    public Room Room { get; set; } = null!;

    public bool IsAdmin { get; init; } = true;

    /// <summary>
    /// If this person can publish audio
    /// </summary>
    public bool IsSpeaker { get; init; }
}
