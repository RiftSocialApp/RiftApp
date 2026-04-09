package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Report struct {
	ID             string           `json:"id"`
	ReporterID     string           `json:"reporter_id"`
	ReportedUserID *string          `json:"reported_user_id,omitempty"`
	MessageID      *string          `json:"message_id,omitempty"`
	HubID          *string          `json:"hub_id,omitempty"`
	Reason         string           `json:"reason"`
	Category       string           `json:"category"`
	Status         string           `json:"status"`
	ModeratorID    *string          `json:"moderator_id,omitempty"`
	ModeratorNote  *string          `json:"moderator_note,omitempty"`
	AutoModeration json.RawMessage  `json:"auto_moderation,omitempty"`
	CreatedAt      time.Time        `json:"created_at"`
	ResolvedAt     *time.Time       `json:"resolved_at,omitempty"`
	ReporterName   string           `json:"reporter_name,omitempty"`
	ReportedName   string           `json:"reported_name,omitempty"`
	MessageContent string           `json:"message_content,omitempty"`
	HubName        string           `json:"hub_name,omitempty"`
}

type ModerationAction struct {
	ID           string          `json:"id"`
	ReportID     *string         `json:"report_id,omitempty"`
	ActionType   string          `json:"action_type"`
	TargetUserID *string         `json:"target_user_id,omitempty"`
	TargetHubID  *string         `json:"target_hub_id,omitempty"`
	PerformedBy  string          `json:"performed_by"`
	Details      json.RawMessage `json:"details,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

type ReportRepo struct {
	db *pgxpool.Pool
}

func NewReportRepo(db *pgxpool.Pool) *ReportRepo {
	return &ReportRepo{db: db}
}

func (r *ReportRepo) Create(ctx context.Context, report *Report) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO reports (id, reporter_id, reported_user_id, message_id, hub_id, reason, category, auto_moderation, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		report.ID, report.ReporterID, report.ReportedUserID, report.MessageID,
		report.HubID, report.Reason, report.Category, report.AutoModeration, report.CreatedAt)
	return err
}

func (r *ReportRepo) GetByID(ctx context.Context, id string) (*Report, error) {
	rpt := &Report{}
	err := r.db.QueryRow(ctx,
		`SELECT r.id, r.reporter_id, r.reported_user_id, r.message_id, r.hub_id,
		        r.reason, r.category, r.status, r.moderator_id, r.moderator_note,
		        r.auto_moderation, r.created_at, r.resolved_at,
		        COALESCE(reporter.display_name,''),
		        COALESCE(reported.display_name,''),
		        COALESCE(m.content,''),
		        COALESCE(h.name,'')
		 FROM reports r
		 LEFT JOIN users reporter ON r.reporter_id = reporter.id
		 LEFT JOIN users reported ON r.reported_user_id = reported.id
		 LEFT JOIN messages m ON r.message_id = m.id
		 LEFT JOIN hubs h ON r.hub_id = h.id
		 WHERE r.id = $1`, id).Scan(
		&rpt.ID, &rpt.ReporterID, &rpt.ReportedUserID, &rpt.MessageID, &rpt.HubID,
		&rpt.Reason, &rpt.Category, &rpt.Status, &rpt.ModeratorID, &rpt.ModeratorNote,
		&rpt.AutoModeration, &rpt.CreatedAt, &rpt.ResolvedAt,
		&rpt.ReporterName, &rpt.ReportedName, &rpt.MessageContent, &rpt.HubName)
	if err != nil {
		return nil, err
	}
	return rpt, nil
}

type ReportFilter struct {
	Status   string
	Category string
	Limit    int
	Offset   int
}

func (r *ReportRepo) List(ctx context.Context, f ReportFilter) ([]Report, int, error) {
	where := "1=1"
	args := []interface{}{}
	argN := 1
	if f.Status != "" {
		where += " AND r.status = $" + itoa(argN)
		args = append(args, f.Status)
		argN++
	}
	if f.Category != "" {
		where += " AND r.category = $" + itoa(argN)
		args = append(args, f.Category)
		argN++
	}

	var total int
	countQ := "SELECT COUNT(*) FROM reports r WHERE " + where
	_ = r.db.QueryRow(ctx, countQ, args...).Scan(&total)

	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	q := `SELECT r.id, r.reporter_id, r.reported_user_id, r.message_id, r.hub_id,
	             r.reason, r.category, r.status, r.moderator_id, r.moderator_note,
	             r.auto_moderation, r.created_at, r.resolved_at,
	             COALESCE(reporter.display_name,''),
	             COALESCE(reported.display_name,''),
	             COALESCE(m.content,''),
	             COALESCE(h.name,'')
	      FROM reports r
	      LEFT JOIN users reporter ON r.reporter_id = reporter.id
	      LEFT JOIN users reported ON r.reported_user_id = reported.id
	      LEFT JOIN messages m ON r.message_id = m.id
	      LEFT JOIN hubs h ON r.hub_id = h.id
	      WHERE ` + where + `
	      ORDER BY r.created_at DESC
	      LIMIT $` + itoa(argN) + ` OFFSET $` + itoa(argN+1)
	args = append(args, limit, f.Offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reports []Report
	for rows.Next() {
		var rpt Report
		if err := rows.Scan(
			&rpt.ID, &rpt.ReporterID, &rpt.ReportedUserID, &rpt.MessageID, &rpt.HubID,
			&rpt.Reason, &rpt.Category, &rpt.Status, &rpt.ModeratorID, &rpt.ModeratorNote,
			&rpt.AutoModeration, &rpt.CreatedAt, &rpt.ResolvedAt,
			&rpt.ReporterName, &rpt.ReportedName, &rpt.MessageContent, &rpt.HubName,
		); err != nil {
			return nil, 0, err
		}
		reports = append(reports, rpt)
	}
	if reports == nil {
		reports = []Report{}
	}
	return reports, total, nil
}

func (r *ReportRepo) UpdateStatus(ctx context.Context, id, status string, moderatorID *string, note *string) error {
	var resolvedAt *time.Time
	if status == "resolved" || status == "dismissed" {
		now := time.Now()
		resolvedAt = &now
	}
	_, err := r.db.Exec(ctx,
		`UPDATE reports SET status=$2, moderator_id=$3, moderator_note=$4, resolved_at=$5 WHERE id=$1`,
		id, status, moderatorID, note, resolvedAt)
	return err
}

func (r *ReportRepo) CreateAction(ctx context.Context, action *ModerationAction) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO moderation_actions (id, report_id, action_type, target_user_id, target_hub_id, performed_by, details, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		action.ID, action.ReportID, action.ActionType, action.TargetUserID,
		action.TargetHubID, action.PerformedBy, action.Details, action.CreatedAt)
	return err
}

func (r *ReportRepo) Stats(ctx context.Context) (map[string]interface{}, error) {
	stats := map[string]interface{}{}

	var total, open, resolved, dismissed int
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM reports`).Scan(&total)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM reports WHERE status='open'`).Scan(&open)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM reports WHERE status='resolved'`).Scan(&resolved)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM reports WHERE status='dismissed'`).Scan(&dismissed)

	var flaggedImages int
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM attachments WHERE moderation_status='flagged'`).Scan(&flaggedImages)

	stats["total_reports"] = total
	stats["open"] = open
	stats["resolved"] = resolved
	stats["dismissed"] = dismissed
	stats["flagged_images"] = flaggedImages

	return stats, nil
}

func itoa(n int) string {
	s := ""
	if n == 0 {
		return "0"
	}
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
