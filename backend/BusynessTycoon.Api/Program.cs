using FluentMigrator.Runner;
using BusynessTycoon.Api.Data;
using BusynessTycoon.Api.Repositories;
using BusynessTycoon.Api.Services;
using BusynessTycoon.Api.Migrations;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database connection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=busyness.db";

builder.Services.AddSingleton<IDbConnectionFactory>(new SqliteConnectionFactory(connectionString));

// Repositories
builder.Services.AddScoped<IPlayerRepository, PlayerRepository>();

// Services
builder.Services.AddScoped<IGameService, GameService>();

// FluentMigrator
builder.Services.AddFluentMigratorCore()
    .ConfigureRunner(rb => rb
        .AddSQLite()
        .WithGlobalConnectionString(connectionString)
        .ScanIn(typeof(InitialCreate).Assembly).For.Migrations())
    .AddLogging(lb => lb.AddFluentMigratorConsole());

// CORS for frontend dev
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Run migrations
using (var scope = app.Services.CreateScope())
{
    var runner = scope.ServiceProvider.GetRequiredService<IMigrationRunner>();
    runner.MigrateUp();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

app.UseAuthorization();

app.MapControllers();

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTimeOffset.UtcNow }));

app.Run();
