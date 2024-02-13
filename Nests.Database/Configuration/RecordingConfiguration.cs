using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nests.Database.Configuration;

public class RecordingConfiguration : IEntityTypeConfiguration<Recording>
{
    public void Configure(EntityTypeBuilder<Recording> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.StartedBy)
            .IsRequired();

        builder.Property(a => a.Started)
            .IsRequired();
        builder.Property(a => a.Stopped);

        builder.Property(a => a.EgressId)
            .IsRequired();

        builder.HasOne(a => a.Room)
            .WithMany(a => a.Recordings)
            .HasForeignKey(a => a.RoomId)
            .HasPrincipalKey(a => a.Id);
    }
}