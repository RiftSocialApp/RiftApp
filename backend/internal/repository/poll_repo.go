package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Poll struct {
	ID        string          `json:"id"`
	HubID     string          `json:"hub_id"`
	StreamID  string          `json:"stream_id"`
	MessageID *string         `json:"message_id,omitempty"`
	AuthorID  string          `json:"author_id"`
	Question  string          `json:"question"`
	Options   json.RawMessage `json:"options"`
	MultiVote bool            `json:"multi_vote"`
	EndsAt    *time.Time      `json:"ends_at,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

type PollVote struct {
	PollID    string    `json:"poll_id"`
	UserID    string    `json:"user_id"`
	OptionIdx int       `json:"option_idx"`
	CreatedAt time.Time `json:"created_at"`
}

type PollRepo struct {
	db *pgxpool.Pool
}

func NewPollRepo(db *pgxpool.Pool) *PollRepo {
	return &PollRepo{db: db}
}

func (r *PollRepo) Create(ctx context.Context, poll *Poll) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO polls (id, hub_id, stream_id, message_id, author_id, question, options, multi_vote, ends_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		poll.ID, poll.HubID, poll.StreamID, poll.MessageID, poll.AuthorID, poll.Question, poll.Options, poll.MultiVote, poll.EndsAt, poll.CreatedAt)
	return err
}

func (r *PollRepo) GetByID(ctx context.Context, id string) (*Poll, error) {
	var poll Poll
	err := r.db.QueryRow(ctx,
		`SELECT id, hub_id, stream_id, message_id, author_id, question, options, multi_vote, ends_at, created_at FROM polls WHERE id = $1`, id).
		Scan(&poll.ID, &poll.HubID, &poll.StreamID, &poll.MessageID, &poll.AuthorID, &poll.Question, &poll.Options, &poll.MultiVote, &poll.EndsAt, &poll.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &poll, nil
}

func (r *PollRepo) Vote(ctx context.Context, pollID, userID string, optionIdx int) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO poll_votes (poll_id, user_id, option_idx, created_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING`,
		pollID, userID, optionIdx)
	return err
}

func (r *PollRepo) RemoveVote(ctx context.Context, pollID, userID string, optionIdx int) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2 AND option_idx = $3`,
		pollID, userID, optionIdx)
	return err
}

func (r *PollRepo) GetVoteCounts(ctx context.Context, pollID string) (map[int]int, error) {
	rows, err := r.db.Query(ctx,
		`SELECT option_idx, COUNT(*) FROM poll_votes WHERE poll_id = $1 GROUP BY option_idx`, pollID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[int]int)
	for rows.Next() {
		var idx, count int
		if err := rows.Scan(&idx, &count); err != nil {
			return nil, err
		}
		counts[idx] = count
	}
	return counts, nil
}

type Reminder struct {
	ID        string    `json:"id"`
	HubID     string    `json:"hub_id"`
	UserID    string    `json:"user_id"`
	StreamID  *string   `json:"stream_id,omitempty"`
	Message   string    `json:"message"`
	RemindAt  time.Time `json:"remind_at"`
	Fired     bool      `json:"fired"`
	CreatedAt time.Time `json:"created_at"`
}

func (r *PollRepo) CreateReminder(ctx context.Context, rem *Reminder) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO reminders (id, hub_id, user_id, stream_id, message, remind_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		rem.ID, rem.HubID, rem.UserID, rem.StreamID, rem.Message, rem.RemindAt, rem.CreatedAt)
	return err
}

func (r *PollRepo) ListPendingReminders(ctx context.Context, before time.Time) ([]Reminder, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, hub_id, user_id, stream_id, message, remind_at, fired, created_at FROM reminders WHERE NOT fired AND remind_at <= $1 ORDER BY remind_at LIMIT 100`, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []Reminder
	for rows.Next() {
		var rem Reminder
		if err := rows.Scan(&rem.ID, &rem.HubID, &rem.UserID, &rem.StreamID, &rem.Message, &rem.RemindAt, &rem.Fired, &rem.CreatedAt); err != nil {
			return nil, err
		}
		reminders = append(reminders, rem)
	}
	return reminders, nil
}

func (r *PollRepo) MarkReminderFired(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE reminders SET fired = true WHERE id = $1`, id)
	return err
}
