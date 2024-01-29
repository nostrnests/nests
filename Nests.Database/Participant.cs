namespace Nests.Database;

public class Participant
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Room Room { get; init; } = null!;
    public Role Role { get; init; } = null!;
}