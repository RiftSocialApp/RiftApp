package moderation

import (
	"context"
	"log"
	"strings"
)

var defaultTextClassifiers = []string{"toxicity", "spam", "nsfw_text"}

type Service struct {
	client *Client
}

func NewService(client *Client) *Service {
	return &Service{client: client}
}

// CheckText runs text through LocalMod classifiers. Returns nil result (allowed) on failure (graceful degradation).
func (s *Service) CheckText(ctx context.Context, text string) *ModerationResult {
	if s == nil || s.client == nil {
		return nil
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}

	resp, err := s.client.AnalyzeText(ctx, text, defaultTextClassifiers)
	if err != nil {
		log.Printf("moderation: text analysis failed (allowing content): %v", err)
		return nil
	}
	if !resp.Flagged {
		return nil
	}

	result := &ModerationResult{
		Flagged: true,
		Details: resp.Results,
	}
	for _, r := range resp.Results {
		if r.Flagged && r.Confidence > result.Confidence {
			result.Category = r.Classifier
			result.Severity = r.Severity
			result.Confidence = r.Confidence
		}
	}
	return result
}

// CheckImage runs an image URL through LocalMod NSFW detection. Returns nil (allowed) on failure.
func (s *Service) CheckImage(ctx context.Context, imageURL string) *ModerationResult {
	if s == nil || s.client == nil {
		return nil
	}

	resp, err := s.client.AnalyzeImageURL(ctx, imageURL)
	if err != nil {
		log.Printf("moderation: image analysis failed (allowing content): %v", err)
		return nil
	}
	if !resp.Flagged {
		return nil
	}

	result := &ModerationResult{
		Flagged: true,
		Details: resp.Results,
	}
	for _, r := range resp.Results {
		if r.Flagged && r.Confidence > result.Confidence {
			result.Category = r.Classifier
			result.Severity = r.Severity
			result.Confidence = r.Confidence
		}
	}
	return result
}

// AnalyzeForReport runs full analysis (all classifiers) for report context. Returns raw response.
func (s *Service) AnalyzeForReport(ctx context.Context, text string) *AnalyzeResponse {
	if s == nil || s.client == nil {
		return nil
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}

	resp, err := s.client.AnalyzeText(ctx, text, []string{"toxicity", "spam", "nsfw_text", "pii"})
	if err != nil {
		log.Printf("moderation: report analysis failed: %v", err)
		return nil
	}
	return resp
}
