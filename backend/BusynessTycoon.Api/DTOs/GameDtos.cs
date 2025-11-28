namespace BusynessTycoon.Api.DTOs;

public record CreatePlayerRequest(string DisplayName);

public record SyncRequest(
    decimal Cash,
    int? Gems = null,
    int? Energy = null,
    decimal? TotalEarnings = null,
    List<IndustryStateDto>? Industries = null,
    List<GameActionDto>? PendingActions = null
);

public record IndustryStateDto(
    int IndustryId,
    int Level,
    decimal Stability,
    long LastCollectedAt,
    bool IsUnlocked,
    decimal PendingEarnings
);

public record GameActionDto(
    string Type,
    Dictionary<string, object> Payload,
    long ClientTimestamp
);

public record PlayerStateResponse(
    string PlayerId,
    string DisplayName,
    CurrenciesDto Currencies,
    PrestigeDto Prestige,
    DailyDto Daily,
    List<IndustryStateDto> Industries,
    long LastSyncAt
);

public record CurrenciesDto(
    decimal Cash,
    int Gems,
    int Influence,
    int Energy
);

public record PrestigeDto(
    int Count,
    decimal Multiplier,
    int EmpirePoints,
    List<int> UnlockedPerks
);

public record DailyDto(
    string LastLoginDate,
    int StreakCount,
    List<int> ClaimedDays,
    string? LastSpinDate,
    int SpinPityCount
);

public record LeaderboardResponse(
    List<LeaderboardEntryDto> Entries,
    int? PlayerRank,
    int TotalPlayers
);

public record LeaderboardEntryDto(
    string PlayerId,
    string DisplayName,
    decimal TotalEarnings,
    int PrestigeCount,
    int Rank
);

public record PrestigeRequest(int EmpirePointsSpent, List<int> NewPerks);

public record SpinWheelResponse(
    string RewardType,
    string RewardTier,
    decimal Amount,
    string Label
);

public record ApiResponse<T>(bool Success, T? Data, string? Error);
