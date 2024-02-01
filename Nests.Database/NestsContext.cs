using Microsoft.EntityFrameworkCore;

namespace Nests.Database;

public class NestsContext : DbContext
{
    public NestsContext()
    {
    }

    public DbSet<Room> Rooms => Set<Room>();

    public DbSet<Participant> Participants => Set<Participant>();
    
    public NestsContext(DbContextOptions<NestsContext> ctx) : base(ctx)
    {
    }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(Room).Assembly);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseNpgsql();
    }
}
