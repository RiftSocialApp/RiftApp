package botengine

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/riftapp-cloud/riftapp/internal/models"
	"github.com/riftapp-cloud/riftapp/internal/repository"
	"github.com/riftapp-cloud/riftapp/internal/service"
)

type HubContext struct {
	HubID     string
	BotUserID string
	Config    []byte

	msgSvc   *service.MessageService
	hubSvc   *service.HubService
	rankRepo *repository.RankRepo
	pollRepo *repository.PollRepo
	xpRepo   *repository.XPRepo
	hubRepo  *repository.HubRepo
	modRepo  *repository.HubModerationRepo
}

func (h *HubContext) SendMessage(ctx context.Context, streamID, content string, embeds []models.Embed, components []models.Component) (*models.Message, error) {
	return h.msgSvc.Create(ctx, h.BotUserID, streamID, service.CreateMessageInput{
		Content:    content,
		Embeds:     embeds,
		Components: components,
	})
}

func (h *HubContext) SendEmbed(ctx context.Context, streamID string, embed models.Embed) (*models.Message, error) {
	return h.SendMessage(ctx, streamID, "", []models.Embed{embed}, nil)
}

func (h *HubContext) DeleteMessage(ctx context.Context, messageID string) error {
	return h.msgSvc.Delete(ctx, h.BotUserID, messageID)
}

func (h *HubContext) BanMember(ctx context.Context, userID, reason string) error {
	if h.modRepo == nil {
		return fmt.Errorf("moderation repo not available")
	}
	if err := h.modRepo.CreateBan(ctx, h.HubID, userID, h.BotUserID, reason); err != nil {
		return err
	}
	if h.hubRepo != nil {
		_ = h.hubRepo.RemoveMember(ctx, h.HubID, userID)
	}
	return nil
}

func (h *HubContext) KickMember(ctx context.Context, userID string) error {
	if h.hubRepo == nil {
		return fmt.Errorf("hub repo not available")
	}
	return h.hubRepo.RemoveMember(ctx, h.HubID, userID)
}

func (h *HubContext) AssignRole(ctx context.Context, userID, rankID string) error {
	if h.rankRepo == nil {
		return fmt.Errorf("rank repo not available")
	}
	return h.rankRepo.AssignRank(ctx, h.HubID, userID, rankID)
}

func (h *HubContext) GetHubMemberCount(ctx context.Context) (int, error) {
	if h.hubRepo == nil {
		return 0, fmt.Errorf("hub repo not available")
	}
	return h.hubRepo.CountMembers(ctx, h.HubID)
}

func (h *HubContext) CreatePoll(ctx context.Context, poll *repository.Poll) error {
	if h.pollRepo == nil {
		return fmt.Errorf("poll repo not available")
	}
	return h.pollRepo.Create(ctx, poll)
}

func (h *HubContext) VotePoll(ctx context.Context, pollID, userID string, optionIdx int) error {
	if h.pollRepo == nil {
		return fmt.Errorf("poll repo not available")
	}
	return h.pollRepo.Vote(ctx, pollID, userID, optionIdx)
}

func (h *HubContext) GetPollVoteCounts(ctx context.Context, pollID string) (map[int]int, error) {
	if h.pollRepo == nil {
		return nil, fmt.Errorf("poll repo not available")
	}
	return h.pollRepo.GetVoteCounts(ctx, pollID)
}

func (h *HubContext) GetPoll(ctx context.Context, pollID string) (*repository.Poll, error) {
	if h.pollRepo == nil {
		return nil, fmt.Errorf("poll repo not available")
	}
	return h.pollRepo.GetByID(ctx, pollID)
}

func (h *HubContext) CreateReminder(ctx context.Context, userID, message string, streamID *string, remindAt time.Time) error {
	if h.pollRepo == nil {
		return fmt.Errorf("poll repo not available")
	}
	return h.pollRepo.CreateReminder(ctx, &repository.Reminder{
		ID:        uuid.New().String(),
		HubID:     h.HubID,
		UserID:    userID,
		StreamID:  streamID,
		Message:   message,
		RemindAt:  remindAt,
		CreatedAt: time.Now(),
	})
}

func (h *HubContext) AddXP(ctx context.Context, userID string, amount int64, cooldownSeconds int) (int64, int, bool, error) {
	if h.xpRepo == nil {
		return 0, 0, false, fmt.Errorf("xp repo not available")
	}
	return h.xpRepo.AddXP(ctx, h.HubID, userID, amount, cooldownSeconds)
}

func (h *HubContext) GetMemberXP(ctx context.Context, userID string) (*repository.MemberXP, error) {
	if h.xpRepo == nil {
		return nil, fmt.Errorf("xp repo not available")
	}
	return h.xpRepo.GetMemberXP(ctx, h.HubID, userID)
}

func (h *HubContext) GetLeaderboard(ctx context.Context, limit int) ([]repository.MemberXP, error) {
	if h.xpRepo == nil {
		return nil, fmt.Errorf("xp repo not available")
	}
	return h.xpRepo.Leaderboard(ctx, h.HubID, limit)
}

func (h *HubContext) GetLevelRoles(ctx context.Context) ([]repository.LevelRole, error) {
	if h.xpRepo == nil {
		return nil, fmt.Errorf("xp repo not available")
	}
	return h.xpRepo.GetLevelRoles(ctx, h.HubID)
}
