package pubsub

import "context"

type NoopBroker struct{}

func NewNoopBroker() *NoopBroker {
	return &NoopBroker{}
}

func (b *NoopBroker) Publish(ctx context.Context, channel string, payload []byte) error {
	return nil
}

func (b *NoopBroker) Subscribe(ctx context.Context, channel string, handler func([]byte)) error {
	return nil
}

func (b *NoopBroker) Close() error {
	return nil
}
