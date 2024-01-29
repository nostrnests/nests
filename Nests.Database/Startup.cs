using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Nests.Database;

public static class Startup
{
    public static void AddNestsDatabase(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<NestsContext>(opt => { opt.UseNpgsql(config.GetConnectionString("Database")); });
    }
}
