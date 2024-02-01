using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Nests.Database;
using NestsBackend.Services;
using Newtonsoft.Json;
using Nostr.Client.Json;
using Prometheus;

namespace NestsBackend;

internal static class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var config = builder.Configuration.GetSection("Config").Get<Config>()!;
        if (config == default)
        {
            throw new Exception("Config missing");
        }

        builder.Services.AddSingleton(config);
        builder.Services.AddTransient<LiveKitApi>();
        builder.Services.AddTransient<LiveKitJwt>();
        
        
        JsonConvert.DefaultSettings = () => NostrSerializer.Settings;
        builder.Services.AddControllers().AddNewtonsoftJson(o => { o.SerializerSettings.NullValueHandling = NullValueHandling.Ignore; });

        builder.Services.AddNestsDatabase(builder.Configuration);
        builder.Services.AddAuthentication(o => { o.AddScheme<NostrAuthHandler>(NostrAuth.Scheme, "Nostr Auth"); });

        builder.Services.AddAuthorization(o =>
        {
            o.DefaultPolicy = new AuthorizationPolicy(new[]
            {
                new ClaimsAuthorizationRequirement(ClaimTypes.Name, null)
            }, new[] {NostrAuth.Scheme});
        });

        builder.Services.AddCors();
        builder.Services.AddHttpClient();
        builder.Services.AddMemoryCache();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddMetrics();

        var app = builder.Build();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NestsContext>();
            await db.Database.MigrateAsync();
        }

        app.UseSwagger();
        app.UseSwaggerUI();
        app.UseCors(o =>
        {
            o.AllowAnyOrigin();
            o.AllowAnyHeader();
            o.AllowAnyMethod();
        });

        app.UseRouting();
        app.UseHttpMetrics();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();
        app.MapMetrics();

        app.MapGet("/", () => "Hello World!");

        await app.RunAsync();
    }

    /// <summary>
    /// Dummy method for EF core migrations
    /// </summary>
    /// <param name="args"></param>
    /// <returns></returns>
    // ReSharper disable once UnusedMember.Global
    public static IHostBuilder CreateHostBuilder(string[] args)
    {
        var dummyHost = Host.CreateDefaultBuilder(args);
        dummyHost.ConfigureServices((ctx, svc) => { svc.AddNestsDatabase(ctx.Configuration); });

        return dummyHost;
    }
}
