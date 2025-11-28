namespace BusynessTycoon.Api.Models;

public class Player
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public long CreatedAt { get; set; }
    public long LastSeenAt { get; set; }
    public int TotalPlaytimeMinutes { get; set; }
    public decimal TotalEarnings { get; set; }
    
    // Currencies
    public decimal Cash { get; set; }
    public int Gems { get; set; }
    public int Influence { get; set; }
    public int Energy { get; set; }
    
    // Prestige
    public int PrestigeCount { get; set; }
    public decimal PrestigeMultiplier { get; set; } = 1.0m;
    public int EmpirePoints { get; set; }
    public string UnlockedPerks { get; set; } = "[]"; // JSON array of perk IDs
    
    // Daily
    public string LastLoginDate { get; set; } = string.Empty;
    public int StreakCount { get; set; }
    public string ClaimedDays { get; set; } = "[]"; // JSON array
    public string? LastSpinDate { get; set; }
    public int SpinPityCount { get; set; }
    
    // Sync
    public long LastSyncAt { get; set; }
    public int BulkRepairsUsedToday { get; set; }
}

public class PlayerIndustry
{
    public int Id { get; set; }
    public string PlayerId { get; set; } = string.Empty;
    public int IndustryId { get; set; }
    public int Level { get; set; }
    public decimal Stability { get; set; } = 100;
    public long LastCollectedAt { get; set; }
    public long LastDecayCalculatedAt { get; set; }
    public bool IsUnlocked { get; set; }
    public decimal PendingEarnings { get; set; }
}

public class GameEvent
{
    public long Id { get; set; }
    public string PlayerId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = "{}"; // JSON
    public long ClientTimestamp { get; set; }
    public long ServerTimestamp { get; set; }
}

public class LeaderboardEntry
{
    public string PlayerId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public decimal TotalEarnings { get; set; }
    public int PrestigeCount { get; set; }
    public int Rank { get; set; }
}
