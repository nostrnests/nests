using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nests.Database.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNodeId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NodeId",
                table: "Recordings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NodeId",
                table: "Recordings",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
