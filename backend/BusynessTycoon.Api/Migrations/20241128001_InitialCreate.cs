using FluentMigrator;

namespace BusynessTycoon.Api.Migrations;

[Migration(20241128001)]
public class InitialCreate : Migration
{
    public override void Up()
    {
        // Players table
        Create.Table("Players")
            .WithColumn("Id").AsString(36).PrimaryKey()
            .WithColumn("DisplayName").AsString(50).NotNullable()
            .WithColumn("CreatedAt").AsInt64().NotNullable()
            .WithColumn("LastSeenAt").AsInt64().NotNullable()
            .WithColumn("TotalPlaytimeMinutes").AsInt32().NotNullable().WithDefaultValue(0)
            .WithColumn("TotalEarnings").AsDecimal().NotNullable().WithDefaultValue(0)
            
            // Currencies
            .WithColumn("Cash").AsDecimal().NotNullable().WithDefaultValue(0)
            .WithColumn("Gems").AsInt32().NotNullable().WithDefaultValue(50)
            .WithColumn("Influence").AsInt32().NotNullable().WithDefaultValue(0)
            .WithColumn("Energy").AsInt32().NotNullable().WithDefaultValue(100)
            
            // Prestige
            .WithColumn("PrestigeCount").AsInt32().NotNullable().WithDefaultValue(0)
            .WithColumn("PrestigeMultiplier").AsDecimal().NotNullable().WithDefaultValue(1.0)
            .WithColumn("EmpirePoints").AsInt32().NotNullable().WithDefaultValue(0)
            .WithColumn("UnlockedPerks").AsString(500).NotNullable().WithDefaultValue("[]")
            
            // Daily
            .WithColumn("LastLoginDate").AsString(10).NotNullable()
            .WithColumn("StreakCount").AsInt32().NotNullable().WithDefaultValue(1)
            .WithColumn("ClaimedDays").AsString(100).NotNullable().WithDefaultValue("[]")
            .WithColumn("LastSpinDate").AsString(10).Nullable()
            .WithColumn("SpinPityCount").AsInt32().NotNullable().WithDefaultValue(0)
            
            // Sync
            .WithColumn("LastSyncAt").AsInt64().NotNullable()
            .WithColumn("BulkRepairsUsedToday").AsInt32().NotNullable().WithDefaultValue(0);

        // Player Industries table
        Create.Table("PlayerIndustries")
            .WithColumn("Id").AsInt32().PrimaryKey().Identity()
            .WithColumn("PlayerId").AsString(36).NotNullable().ForeignKey("Players", "Id")
            .WithColumn("IndustryId").AsInt32().NotNullable()
            .WithColumn("Level").AsInt32().NotNullable().WithDefaultValue(0)
            .WithColumn("Stability").AsDecimal().NotNullable().WithDefaultValue(100)
            .WithColumn("LastCollectedAt").AsInt64().NotNullable()
            .WithColumn("LastDecayCalculatedAt").AsInt64().NotNullable()
            .WithColumn("IsUnlocked").AsBoolean().NotNullable().WithDefaultValue(false)
            .WithColumn("PendingEarnings").AsDecimal().NotNullable().WithDefaultValue(0);

        Create.Index("IX_PlayerIndustries_PlayerId")
            .OnTable("PlayerIndustries")
            .OnColumn("PlayerId");

        Create.UniqueConstraint("UQ_PlayerIndustries_Player_Industry")
            .OnTable("PlayerIndustries")
            .Columns("PlayerId", "IndustryId");

        // Game Events table (for audit/sync)
        Create.Table("GameEvents")
            .WithColumn("Id").AsInt64().PrimaryKey().Identity()
            .WithColumn("PlayerId").AsString(36).NotNullable().ForeignKey("Players", "Id")
            .WithColumn("EventType").AsString(50).NotNullable()
            .WithColumn("Payload").AsString(1000).NotNullable().WithDefaultValue("{}")
            .WithColumn("ClientTimestamp").AsInt64().NotNullable()
            .WithColumn("ServerTimestamp").AsInt64().NotNullable();

        Create.Index("IX_GameEvents_PlayerId")
            .OnTable("GameEvents")
            .OnColumn("PlayerId");

        Create.Index("IX_GameEvents_ServerTimestamp")
            .OnTable("GameEvents")
            .OnColumn("ServerTimestamp");
    }

    public override void Down()
    {
        Delete.Table("GameEvents");
        Delete.Table("PlayerIndustries");
        Delete.Table("Players");
    }
}
