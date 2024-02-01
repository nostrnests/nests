using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Nests.Database.Configuration;

public class ParticipantConfig : IEntityTypeConfiguration<Participant>
{
    public void Configure(EntityTypeBuilder<Participant> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Pubkey)
            .IsRequired();

        builder.Property(a => a.IsAdmin)
            .IsRequired();

        builder.Property(a => a.IsSpeaker)
            .IsRequired();

        builder.HasOne(a => a.Room)
            .WithMany(a => a.Participants)
            .HasForeignKey(a => a.RoomId)
            .HasPrincipalKey(a => a.Id);
    }
}
