using Dapper;
using BusynessTycoon.Api.Data;
using BusynessTycoon.Api.Models;

namespace BusynessTycoon.Api.Repositories;

public interface IPlayerRepository
{
    Task<Player?> GetByIdAsync(string playerId);
    Task<Player> CreateAsync(Player player);
    Task UpdateAsync(Player player);
    Task<IEnumerable<PlayerIndustry>> GetIndustriesAsync(string playerId);
    Task SaveIndustryAsync(PlayerIndustry industry);
    Task<IEnumerable<LeaderboardEntry>> GetLeaderboardAsync(int limit = 100);
    Task AddEventAsync(GameEvent evt);
}

public class PlayerRepository : IPlayerRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PlayerRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<Player?> GetByIdAsync(string playerId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<Player>(
            "SELECT * FROM Players WHERE Id = @Id",
            new { Id = playerId });
    }

    public async Task<Player> CreateAsync(Player player)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        await connection.ExecuteAsync(@"
            INSERT INTO Players (
                Id, DisplayName, CreatedAt, LastSeenAt, TotalPlaytimeMinutes, TotalEarnings,
                Cash, Gems, Influence, Energy,
                PrestigeCount, PrestigeMultiplier, EmpirePoints, UnlockedPerks,
                LastLoginDate, StreakCount, ClaimedDays, LastSpinDate, SpinPityCount,
                LastSyncAt, BulkRepairsUsedToday
            ) VALUES (
                @Id, @DisplayName, @CreatedAt, @LastSeenAt, @TotalPlaytimeMinutes, @TotalEarnings,
                @Cash, @Gems, @Influence, @Energy,
                @PrestigeCount, @PrestigeMultiplier, @EmpirePoints, @UnlockedPerks,
                @LastLoginDate, @StreakCount, @ClaimedDays, @LastSpinDate, @SpinPityCount,
                @LastSyncAt, @BulkRepairsUsedToday
            )", player);

        return player;
    }

    public async Task UpdateAsync(Player player)
    {
        using var connection = _connectionFactory.CreateConnection();
        
        await connection.ExecuteAsync(@"
            UPDATE Players SET
                DisplayName = @DisplayName,
                LastSeenAt = @LastSeenAt,
                TotalPlaytimeMinutes = @TotalPlaytimeMinutes,
                TotalEarnings = @TotalEarnings,
                Cash = @Cash,
                Gems = @Gems,
                Influence = @Influence,
                Energy = @Energy,
                PrestigeCount = @PrestigeCount,
                PrestigeMultiplier = @PrestigeMultiplier,
                EmpirePoints = @EmpirePoints,
                UnlockedPerks = @UnlockedPerks,
                LastLoginDate = @LastLoginDate,
                StreakCount = @StreakCount,
                ClaimedDays = @ClaimedDays,
                LastSpinDate = @LastSpinDate,
                SpinPityCount = @SpinPityCount,
                LastSyncAt = @LastSyncAt,
                BulkRepairsUsedToday = @BulkRepairsUsedToday
            WHERE Id = @Id", player);
    }

    public async Task<IEnumerable<PlayerIndustry>> GetIndustriesAsync(string playerId)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<PlayerIndustry>(
            "SELECT * FROM PlayerIndustries WHERE PlayerId = @PlayerId ORDER BY IndustryId",
            new { PlayerId = playerId });
    }

    public async Task SaveIndustryAsync(PlayerIndustry industry)
    {
        using var connection = _connectionFactory.CreateConnection();

        if (industry.Id == 0)
        {
            industry.Id = await connection.QuerySingleAsync<int>(@"
                INSERT INTO PlayerIndustries (
                    PlayerId, IndustryId, Level, Stability, 
                    LastCollectedAt, LastDecayCalculatedAt, IsUnlocked, PendingEarnings
                ) VALUES (
                    @PlayerId, @IndustryId, @Level, @Stability,
                    @LastCollectedAt, @LastDecayCalculatedAt, @IsUnlocked, @PendingEarnings
                );
                SELECT last_insert_rowid();", industry);
        }
        else
        {
            await connection.ExecuteAsync(@"
                UPDATE PlayerIndustries SET
                    Level = @Level,
                    Stability = @Stability,
                    LastCollectedAt = @LastCollectedAt,
                    LastDecayCalculatedAt = @LastDecayCalculatedAt,
                    IsUnlocked = @IsUnlocked,
                    PendingEarnings = @PendingEarnings
                WHERE Id = @Id", industry);
        }
    }

    public async Task<IEnumerable<LeaderboardEntry>> GetLeaderboardAsync(int limit = 100)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QueryAsync<LeaderboardEntry>(@"
            SELECT 
                Id as PlayerId,
                DisplayName,
                TotalEarnings,
                PrestigeCount,
                ROW_NUMBER() OVER (ORDER BY TotalEarnings DESC) as Rank
            FROM Players
            ORDER BY TotalEarnings DESC
            LIMIT @Limit", new { Limit = limit });
    }

    public async Task AddEventAsync(GameEvent evt)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.ExecuteAsync(@"
            INSERT INTO GameEvents (PlayerId, EventType, Payload, ClientTimestamp, ServerTimestamp)
            VALUES (@PlayerId, @EventType, @Payload, @ClientTimestamp, @ServerTimestamp)", evt);
    }
}
