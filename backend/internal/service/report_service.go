package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/riftapp-cloud/riftapp/internal/apperror"
	"github.com/riftapp-cloud/riftapp/internal/moderation"
	"github.com/riftapp-cloud/riftapp/internal/repository"
)

type ReportService struct {
	repo   *repository.ReportRepo
	modSvc *moderation.Service
}

func NewReportService(repo *repository.ReportRepo, modSvc *moderation.Service) *ReportService {
	return &ReportService{repo: repo, modSvc: modSvc}
}

type CreateReportInput struct {
	ReportedUserID *string `json:"reported_user_id"`
	MessageID      *string `json:"message_id"`
	HubID          *string `json:"hub_id"`
	Reason         string  `json:"reason"`
	Category       string  `json:"category"`
	MessageContent string  `json:"message_content"`
}

func (s *ReportService) Create(ctx context.Context, reporterID string, input CreateReportInput) (*repository.Report, error) {
	if input.Reason == "" {
		return nil, apperror.BadRequest("reason is required")
	}
	cat := input.Category
	if cat == "" {
		cat = "other"
	}

	var autoMod json.RawMessage
	if s.modSvc != nil && input.MessageContent != "" {
		if resp := s.modSvc.AnalyzeForReport(ctx, input.MessageContent); resp != nil {
			autoMod, _ = json.Marshal(resp)
		}
	}

	report := &repository.Report{
		ID:             uuid.New().String(),
		ReporterID:     reporterID,
		ReportedUserID: input.ReportedUserID,
		MessageID:      input.MessageID,
		HubID:          input.HubID,
		Reason:         input.Reason,
		Category:       cat,
		AutoModeration: autoMod,
		CreatedAt:      time.Now(),
	}

	if err := s.repo.Create(ctx, report); err != nil {
		return nil, apperror.Internal("failed to create report", err)
	}
	return s.repo.GetByID(ctx, report.ID)
}

func (s *ReportService) Get(ctx context.Context, id string) (*repository.Report, error) {
	rpt, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperror.NotFound("report not found")
	}
	return rpt, nil
}

func (s *ReportService) List(ctx context.Context, status, category string, limit, offset int) ([]repository.Report, int, error) {
	return s.repo.List(ctx, repository.ReportFilter{
		Status:   status,
		Category: category,
		Limit:    limit,
		Offset:   offset,
	})
}

func (s *ReportService) Resolve(ctx context.Context, id, moderatorID, status string, note *string) error {
	if status != "resolved" && status != "dismissed" && status != "reviewing" {
		return apperror.BadRequest("invalid status")
	}
	return s.repo.UpdateStatus(ctx, id, status, &moderatorID, note)
}

type TakeActionInput struct {
	ActionType   string  `json:"action_type"`
	TargetUserID *string `json:"target_user_id"`
	TargetHubID  *string `json:"target_hub_id"`
}

func (s *ReportService) TakeAction(ctx context.Context, reportID, performedBy string, input TakeActionInput) error {
	if input.ActionType == "" {
		return apperror.BadRequest("action_type is required")
	}
	action := &repository.ModerationAction{
		ID:           uuid.New().String(),
		ReportID:     &reportID,
		ActionType:   input.ActionType,
		TargetUserID: input.TargetUserID,
		TargetHubID:  input.TargetHubID,
		PerformedBy:  performedBy,
		CreatedAt:    time.Now(),
	}
	return s.repo.CreateAction(ctx, action)
}

func (s *ReportService) Stats(ctx context.Context) (map[string]interface{}, error) {
	return s.repo.Stats(ctx)
}
