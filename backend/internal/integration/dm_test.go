package integration

import (
	"context"
	"testing"

	"github.com/riftapp-cloud/riftapp/internal/auth"
	"github.com/riftapp-cloud/riftapp/internal/repository"
	"github.com/riftapp-cloud/riftapp/internal/service"
	"github.com/riftapp-cloud/riftapp/internal/ws"
)

func TestDMReadStatesIgnoreOwnMessages(t *testing.T) {
	cleanTables(t)
	ctx := context.Background()

	authSvc := auth.NewService(testPool, "integration-test-secret")
	sender, err := authSvc.Register(ctx, auth.RegisterInput{
		Username: "dm_sender",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("register sender failed: %v", err)
	}

	recipient, err := authSvc.Register(ctx, auth.RegisterInput{
		Username: "dm_recipient",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("register recipient failed: %v", err)
	}

	dmSvc := service.NewDMService(
		repository.NewDMRepo(testPool),
		repository.NewMessageRepo(testPool),
		nil,
		ws.NewHub(testPool),
	)

	conversation, _, err := dmSvc.CreateOrOpen(ctx, sender.User.ID, recipient.User.ID)
	if err != nil {
		t.Fatalf("create or open dm failed: %v", err)
	}

	if _, err := dmSvc.SendMessage(ctx, conversation.ID, sender.User.ID, service.SendDMInput{
		Content: "https://riftapp.io/invite/test-code",
	}); err != nil {
		t.Fatalf("send dm message failed: %v", err)
	}

	senderStates, err := dmSvc.ReadStates(ctx, sender.User.ID)
	if err != nil {
		t.Fatalf("read sender states failed: %v", err)
	}
	if unread := unreadCountForConversation(senderStates, conversation.ID); unread != 0 {
		t.Fatalf("expected sender unread count 0, got %d", unread)
	}

	recipientStates, err := dmSvc.ReadStates(ctx, recipient.User.ID)
	if err != nil {
		t.Fatalf("read recipient states failed: %v", err)
	}
	if unread := unreadCountForConversation(recipientStates, conversation.ID); unread != 1 {
		t.Fatalf("expected recipient unread count 1, got %d", unread)
	}
}

func unreadCountForConversation(states []repository.DMReadState, conversationID string) int {
	for _, state := range states {
		if state.ConversationID == conversationID {
			return state.UnreadCount
		}
	}
	return -1
}
