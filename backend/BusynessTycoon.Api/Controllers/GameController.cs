using Microsoft.AspNetCore.Mvc;
using BusynessTycoon.Api.DTOs;
using BusynessTycoon.Api.Services;

namespace BusynessTycoon.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GameController : ControllerBase
{
    private readonly IGameService _gameService;
    private readonly ILogger<GameController> _logger;

    public GameController(IGameService gameService, ILogger<GameController> logger)
    {
        _gameService = gameService;
        _logger = logger;
    }

    /// <summary>
    /// Get or create player state
    /// </summary>
    [HttpGet("state/{playerId}")]
    public async Task<ActionResult<ApiResponse<PlayerStateResponse>>> GetState(string playerId)
    {
        try
        {
            var state = await _gameService.GetOrCreatePlayerAsync(playerId);
            return Ok(new ApiResponse<PlayerStateResponse>(true, state, null));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting player state for {PlayerId}", playerId);
            return StatusCode(500, new ApiResponse<PlayerStateResponse>(false, null, ex.Message));
        }
    }

    /// <summary>
    /// Sync player state from client
    /// </summary>
    [HttpPost("sync/{playerId}")]
    public async Task<ActionResult<ApiResponse<PlayerStateResponse>>> Sync(string playerId, [FromBody] SyncRequest request)
    {
        try
        {
            var state = await _gameService.SyncStateAsync(playerId, request);
            return Ok(new ApiResponse<PlayerStateResponse>(true, state, null));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing state for {PlayerId}", playerId);
            return StatusCode(500, new ApiResponse<PlayerStateResponse>(false, null, ex.Message));
        }
    }

    /// <summary>
    /// Get leaderboard
    /// </summary>
    [HttpGet("leaderboard")]
    public async Task<ActionResult<ApiResponse<LeaderboardResponse>>> GetLeaderboard([FromQuery] string? playerId)
    {
        try
        {
            var leaderboard = await _gameService.GetLeaderboardAsync(playerId);
            return Ok(new ApiResponse<LeaderboardResponse>(true, leaderboard, null));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting leaderboard");
            return StatusCode(500, new ApiResponse<LeaderboardResponse>(false, null, ex.Message));
        }
    }

    /// <summary>
    /// Spin the wheel
    /// </summary>
    [HttpPost("spin/{playerId}")]
    public async Task<ActionResult<ApiResponse<SpinWheelResponse>>> SpinWheel(string playerId)
    {
        try
        {
            var result = await _gameService.SpinWheelAsync(playerId);
            return Ok(new ApiResponse<SpinWheelResponse>(true, result, null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<SpinWheelResponse>(false, null, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error spinning wheel for {PlayerId}", playerId);
            return StatusCode(500, new ApiResponse<SpinWheelResponse>(false, null, ex.Message));
        }
    }

    /// <summary>
    /// Execute prestige
    /// </summary>
    [HttpPost("prestige/{playerId}")]
    public async Task<ActionResult<ApiResponse<PlayerStateResponse>>> Prestige(string playerId, [FromBody] PrestigeRequest request)
    {
        try
        {
            var state = await _gameService.ExecutePrestigeAsync(playerId, request);
            return Ok(new ApiResponse<PlayerStateResponse>(true, state, null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<PlayerStateResponse>(false, null, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing prestige for {PlayerId}", playerId);
            return StatusCode(500, new ApiResponse<PlayerStateResponse>(false, null, ex.Message));
        }
    }
}
