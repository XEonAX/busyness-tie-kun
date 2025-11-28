using System.Text.Json;
using BusynessTycoon.Api.DTOs;
using BusynessTycoon.Api.Models;
using BusynessTycoon.Api.Repositories;

namespace BusynessTycoon.Api.Services;

public interface IGameService
{
    Task<PlayerStateResponse> GetOrCreatePlayerAsync(string playerId);
    Task<PlayerStateResponse> SyncStateAsync(string playerId, SyncRequest request);
    Task<LeaderboardResponse> GetLeaderboardAsync(string? currentPlayerId);
    Task<SpinWheelResponse> SpinWheelAsync(string playerId);
    Task<PlayerStateResponse> ExecutePrestigeAsync(string playerId, PrestigeRequest request);
}

public class GameService : IGameService
{
    private readonly IPlayerRepository _playerRepository;
    private readonly ILogger<GameService> _logger;
    private static readonly Random _random = new();

    // Industry definitions (should match frontend)
    private static readonly Dictionary<int, IndustryDefinition> Industries = new()
    {
        { 1, new(1, "Lemonade Stand", 10, 1, 0, 5) },
        { 2, new(2, "Food Truck", 100, 10, 100, 5) },
        { 3, new(3, "Coffee Shop", 1000, 100, 1000, 5) },
        { 4, new(4, "Boutique Store", 10000, 1000, 10000, 5) },
        { 5, new(5, "Restaurant Chain", 100000, 10000, 100000, 5) },
    };

    // Wheel rewards
    private static readonly List<WheelReward> WheelRewards = new()
    {
        new("common", "cash", 100, "$100"),
        new("common", "cash", 250, "$250"),
        new("common", "energy", 10, "+10 Energy"),
        new("uncommon", "cash", 1000, "$1K"),
        new("uncommon", "gems", 5, "+5 Gems"),
        new("rare", "cash", 5000, "$5K"),
        new("rare", "gems", 20, "+20 Gems"),
        new("epic", "gems", 100, "+100 Gems"),
        new("legendary", "gems", 500, "💎 JACKPOT!"),
    };

    private static readonly Dictionary<string, int> TierWeights = new()
    {
        { "common", 60 },
        { "uncommon", 25 },
        { "rare", 12 },
        { "epic", 2 },
        { "legendary", 1 },
    };

    public GameService(IPlayerRepository playerRepository, ILogger<GameService> logger)
    {
        _playerRepository = playerRepository;
        _logger = logger;
    }

    public async Task<PlayerStateResponse> GetOrCreatePlayerAsync(string playerId)
    {
        var player = await _playerRepository.GetByIdAsync(playerId);
        
        if (player == null)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            
            player = new Player
            {
                Id = playerId,
                DisplayName = $"Tycoon{_random.Next(10000)}",
                CreatedAt = now,
                LastSeenAt = now,
                Cash = 0,
                Gems = 50,
                Energy = 100,
                LastLoginDate = today,
                StreakCount = 1,
                LastSyncAt = now,
            };
            
            await _playerRepository.CreateAsync(player);

            // Create initial industries
            foreach (var industry in Industries.Values)
            {
                await _playerRepository.SaveIndustryAsync(new PlayerIndustry
                {
                    PlayerId = playerId,
                    IndustryId = industry.Id,
                    Level = industry.Id == 1 ? 1 : 0, // First industry starts at level 1
                    Stability = 100,
                    LastCollectedAt = now,
                    LastDecayCalculatedAt = now,
                    IsUnlocked = industry.Id == 1,
                    PendingEarnings = 0,
                });
            }
        }
        else
        {
            // Update last seen
            player.LastSeenAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            await _playerRepository.UpdateAsync(player);
        }

        return await BuildPlayerStateResponse(player);
    }

    public async Task<PlayerStateResponse> SyncStateAsync(string playerId, SyncRequest request)
    {
        var player = await _playerRepository.GetByIdAsync(playerId);
        if (player == null)
        {
            throw new InvalidOperationException("Player not found");
        }

        // Update currencies (only update if provided)
        player.Cash = request.Cash;
        if (request.Gems.HasValue) player.Gems = request.Gems.Value;
        if (request.Energy.HasValue) player.Energy = request.Energy.Value;
        if (request.TotalEarnings.HasValue) player.TotalEarnings = request.TotalEarnings.Value;
        player.LastSeenAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        player.LastSyncAt = player.LastSeenAt;

        await _playerRepository.UpdateAsync(player);

        // Update industries (only if provided)
        if (request.Industries != null && request.Industries.Count > 0)
        {
            var existingIndustries = (await _playerRepository.GetIndustriesAsync(playerId)).ToDictionary(i => i.IndustryId);
            
            foreach (var industryDto in request.Industries)
            {
                if (existingIndustries.TryGetValue(industryDto.IndustryId, out var industry))
                {
                    industry.Level = industryDto.Level;
                    industry.Stability = industryDto.Stability;
                    industry.LastCollectedAt = industryDto.LastCollectedAt;
                    industry.IsUnlocked = industryDto.IsUnlocked;
                    industry.PendingEarnings = industryDto.PendingEarnings;
                    industry.LastDecayCalculatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    
                    await _playerRepository.SaveIndustryAsync(industry);
                }
            }
        }

        // Process pending actions (only if provided)
        if (request.PendingActions != null)
        {
            foreach (var action in request.PendingActions)
            {
                await _playerRepository.AddEventAsync(new GameEvent
                {
                    PlayerId = playerId,
                    EventType = action.Type,
                    Payload = JsonSerializer.Serialize(action.Payload),
                    ClientTimestamp = action.ClientTimestamp,
                    ServerTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                });
            }
        }

        return await BuildPlayerStateResponse(player);
    }

    public async Task<LeaderboardResponse> GetLeaderboardAsync(string? currentPlayerId)
    {
        var entries = (await _playerRepository.GetLeaderboardAsync(100)).ToList();
        
        int? playerRank = null;
        if (!string.IsNullOrEmpty(currentPlayerId))
        {
            var playerEntry = entries.FirstOrDefault(e => e.PlayerId == currentPlayerId);
            playerRank = playerEntry?.Rank;
        }

        return new LeaderboardResponse(
            entries.Select(e => new LeaderboardEntryDto(
                e.PlayerId,
                e.DisplayName,
                e.TotalEarnings,
                e.PrestigeCount,
                e.Rank
            )).ToList(),
            playerRank,
            entries.Count
        );
    }

    public async Task<SpinWheelResponse> SpinWheelAsync(string playerId)
    {
        var player = await _playerRepository.GetByIdAsync(playerId);
        if (player == null)
        {
            throw new InvalidOperationException("Player not found");
        }

        // Check if can spin (energy or gems)
        if (player.Energy < 10 && player.Gems < 5)
        {
            throw new InvalidOperationException("Not enough energy or gems to spin");
        }

        // Deduct cost
        if (player.Energy >= 10)
        {
            player.Energy -= 10;
        }
        else
        {
            player.Gems -= 5;
        }

        // Select tier based on weights
        var tier = SelectTier(player.SpinPityCount);
        
        // Update pity counter
        if (tier == "common")
        {
            player.SpinPityCount++;
        }
        else
        {
            player.SpinPityCount = 0;
        }

        // Select reward from tier
        var tierRewards = WheelRewards.Where(r => r.Tier == tier).ToList();
        var reward = tierRewards[_random.Next(tierRewards.Count)];

        // Apply reward
        switch (reward.Type)
        {
            case "cash":
                player.Cash += reward.Multiplier;
                break;
            case "gems":
                player.Gems += (int)reward.Multiplier;
                break;
            case "energy":
                player.Energy = Math.Min(100, player.Energy + (int)reward.Multiplier);
                break;
        }

        player.LastSpinDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        await _playerRepository.UpdateAsync(player);

        // Log event
        await _playerRepository.AddEventAsync(new GameEvent
        {
            PlayerId = playerId,
            EventType = "spin",
            Payload = JsonSerializer.Serialize(new { tier, type = reward.Type, amount = reward.Multiplier }),
            ClientTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            ServerTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        });

        return new SpinWheelResponse(reward.Type, tier, reward.Multiplier, reward.Label);
    }

    public async Task<PlayerStateResponse> ExecutePrestigeAsync(string playerId, PrestigeRequest request)
    {
        var player = await _playerRepository.GetByIdAsync(playerId);
        if (player == null)
        {
            throw new InvalidOperationException("Player not found");
        }

        // Calculate EP based on total earnings
        var earnedEP = (int)Math.Floor(Math.Sqrt((double)(player.TotalEarnings / 1_000_000)));
        
        if (earnedEP <= 0)
        {
            throw new InvalidOperationException("Not enough earnings to prestige");
        }

        // Reset player
        player.PrestigeCount++;
        player.PrestigeMultiplier *= 1.5m;
        player.EmpirePoints += earnedEP;
        player.Cash = 0;
        player.TotalEarnings = 0;

        // Update perks
        var currentPerks = JsonSerializer.Deserialize<List<int>>(player.UnlockedPerks) ?? new List<int>();
        currentPerks.AddRange(request.NewPerks);
        player.UnlockedPerks = JsonSerializer.Serialize(currentPerks.Distinct().ToList());

        await _playerRepository.UpdateAsync(player);

        // Reset industries
        var industries = await _playerRepository.GetIndustriesAsync(playerId);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        foreach (var industry in industries)
        {
            industry.Level = industry.IndustryId == 1 ? 1 : 0;
            industry.Stability = 100;
            industry.IsUnlocked = industry.IndustryId == 1;
            industry.PendingEarnings = 0;
            industry.LastCollectedAt = now;
            industry.LastDecayCalculatedAt = now;
            
            await _playerRepository.SaveIndustryAsync(industry);
        }

        // Log event
        await _playerRepository.AddEventAsync(new GameEvent
        {
            PlayerId = playerId,
            EventType = "prestige",
            Payload = JsonSerializer.Serialize(new { 
                prestigeCount = player.PrestigeCount,
                earnedEP,
                multiplier = player.PrestigeMultiplier 
            }),
            ClientTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            ServerTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        });

        return await BuildPlayerStateResponse(player);
    }

    private string SelectTier(int pityCount)
    {
        // Pity system: after 7 commons in a row, guarantee uncommon+
        if (pityCount >= 7)
        {
            var weights = TierWeights.Where(t => t.Key != "common").ToList();
            var total = weights.Sum(w => w.Value);
            var roll = _random.Next(total);
            
            var cumulative = 0;
            foreach (var (tier, weight) in weights)
            {
                cumulative += weight;
                if (roll < cumulative) return tier;
            }
            return "uncommon";
        }

        // Normal roll
        var totalWeight = TierWeights.Values.Sum();
        var normalRoll = _random.Next(totalWeight);
        
        var cumulativeWeight = 0;
        foreach (var (tier, weight) in TierWeights)
        {
            cumulativeWeight += weight;
            if (normalRoll < cumulativeWeight) return tier;
        }
        return "common";
    }

    private async Task<PlayerStateResponse> BuildPlayerStateResponse(Player player)
    {
        var industries = await _playerRepository.GetIndustriesAsync(player.Id);
        var perks = JsonSerializer.Deserialize<List<int>>(player.UnlockedPerks) ?? new List<int>();
        var claimedDays = JsonSerializer.Deserialize<List<int>>(player.ClaimedDays) ?? new List<int>();

        return new PlayerStateResponse(
            player.Id,
            player.DisplayName,
            new CurrenciesDto(player.Cash, player.Gems, player.Influence, player.Energy),
            new PrestigeDto(player.PrestigeCount, player.PrestigeMultiplier, player.EmpirePoints, perks),
            new DailyDto(player.LastLoginDate, player.StreakCount, claimedDays, player.LastSpinDate, player.SpinPityCount),
            industries.Select(i => new IndustryStateDto(
                i.IndustryId,
                i.Level,
                i.Stability,
                i.LastCollectedAt,
                i.IsUnlocked,
                i.PendingEarnings
            )).ToList(),
            player.LastSyncAt
        );
    }
}

record IndustryDefinition(int Id, string Name, decimal BaseCost, decimal BaseOutput, decimal UnlockCost, decimal DecayRate);
record WheelReward(string Tier, string Type, decimal Multiplier, string Label);
