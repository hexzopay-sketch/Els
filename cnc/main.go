package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
)

func main() {
	webPort := flag.String("web", "8080", "Web panel port")
	flag.Parse()

	initStorage()

	mux := NewWebMux()

	addr := fmt.Sprintf(":%s", *webPort)
	log.Printf("[EL7] Web panel starting on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
