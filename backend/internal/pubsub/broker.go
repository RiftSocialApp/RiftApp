package pubsub

import (
	"context"
)

type Broker interface {
	Publish(ctx context.Context, channel string, payload []byte) error
	Subscribe(ctx context.Context, channel string, handler func([]byte)) error
	Close() error
}
