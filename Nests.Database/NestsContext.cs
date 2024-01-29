using Microsoft.EntityFrameworkCore;

namespace Nests.Database;

public class NestsContext : DbContext
{
    public NestsContext()
    {
    }

    public NestsContext(DbContextOptions<NestsContext> ctx) : base(ctx)
    {
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(Room).Assembly);
    }
}
