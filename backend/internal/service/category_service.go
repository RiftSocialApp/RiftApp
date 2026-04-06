package service

import (
	"context"
	"strings"

	"github.com/riftapp-cloud/riftapp/internal/apperror"
	"github.com/riftapp-cloud/riftapp/internal/models"
	"github.com/riftapp-cloud/riftapp/internal/repository"
)

type CategoryService struct {
	catRepo    *repository.CategoryRepo
	hubService *HubService
}

func NewCategoryService(catRepo *repository.CategoryRepo, hubService *HubService) *CategoryService {
	return &CategoryService{catRepo: catRepo, hubService: hubService}
}

func (s *CategoryService) Create(ctx context.Context, hubID, userID, name string) (*models.Category, error) {
	if !s.hubService.HasPermission(ctx, hubID, userID, models.PermManageStreams) {
		return nil, apperror.Forbidden("you do not have permission to manage channels")
	}
	if name == "" {
		return nil, apperror.BadRequest("name is required")
	}
	cat, err := s.catRepo.Create(ctx, hubID, name)
	if err != nil {
		return nil, apperror.Internal("failed to create category", err)
	}
	return cat, nil
}

func (s *CategoryService) List(ctx context.Context, hubID string) ([]models.Category, error) {
	cats, err := s.catRepo.List(ctx, hubID)
	if err != nil {
		return nil, apperror.Internal("internal error", err)
	}
	if cats == nil {
		cats = []models.Category{}
	}
	return cats, nil
}

func (s *CategoryService) Delete(ctx context.Context, hubID, userID, categoryID string) error {
	if !s.hubService.HasPermission(ctx, hubID, userID, models.PermManageStreams) {
		return apperror.Forbidden("you do not have permission to manage channels")
	}
	if err := s.catRepo.Delete(ctx, categoryID); err != nil {
		return apperror.Internal("failed to delete category", err)
	}
	return nil
}

// Update renames a category.
func (s *CategoryService) Update(ctx context.Context, hubID, userID, categoryID string, name *string) (*models.Category, error) {
	if !s.hubService.HasPermission(ctx, hubID, userID, models.PermManageStreams) {
		return nil, apperror.Forbidden("you do not have permission to manage channels")
	}
	if name != nil {
		n := strings.TrimSpace(*name)
		if n == "" {
			return nil, apperror.BadRequest("name is required")
		}
		if err := s.catRepo.UpdateName(ctx, categoryID, n); err != nil {
			return nil, apperror.Internal("failed to update category", err)
		}
	}
	return s.catRepo.GetByID(ctx, categoryID)
}

// ReorderCategories bulk-updates category positions.
func (s *CategoryService) ReorderCategories(ctx context.Context, hubID, userID string, items []struct {
	ID       string `json:"id"`
	Position int    `json:"position"`
}) error {
	if !s.hubService.HasPermission(ctx, hubID, userID, models.PermManageStreams) {
		return apperror.Forbidden("you do not have permission to manage channels")
	}
	if len(items) == 0 {
		return nil
	}
	bulkItems := make([]struct {
		ID       string
		Position int
	}, len(items))
	for i, it := range items {
		bulkItems[i].ID = it.ID
		bulkItems[i].Position = it.Position
	}
	if err := s.catRepo.BulkUpdatePositions(ctx, hubID, bulkItems); err != nil {
		return apperror.Internal("failed to reorder categories", err)
	}
	return nil
}
