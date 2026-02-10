package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"math"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type StreamConfig struct {
	ID           string `json:"id"`            // идентификатор потока (параметр s)
	ManifestURL  string `json:"manifest_url"`  // http(s) ссылка ИЛИ локальный путь (поддерживается также file://)
	SegmentsBase string `json:"segments_base"` // локальная папка с сегментами этого потока
}

type Config struct {
	Listen  string         `json:"listen"`         // адрес для http (например ":8080")
	CORSAll bool           `json:"cors_allow_all"` // при необходимости включить CORS
	Streams []StreamConfig `json:"streams"`        // описания потоков
}

var (
	cfg       Config
	streamMap map[string]StreamConfig
	httpCli   *http.Client
)

func main() {
	cfgPath := flag.String("config", "config.json", "path to config file (JSON)")
	flag.Parse()

	if err := loadConfig(*cfgPath); err != nil {
		log.Fatalf("config error: %v", err)
	}

	httpCli = &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			Proxy:               http.ProxyFromEnvironment,
			MaxIdleConns:        100,
			IdleConnTimeout:     90 * time.Second,
			DisableCompression:  false,
			ForceAttemptHTTP2:   true,
			TLSHandshakeTimeout: 10 * time.Second,
		},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)
	mux.HandleFunc("/manifest", manifestHandler)
	mux.HandleFunc("/segment", segmentHandler)

	addr := cfg.Listen
	if strings.TrimSpace(addr) == "" {
		addr = ":8080"
	}
	s := &http.Server{
		Addr:              addr,
		Handler:           withCommonHeaders(mux),
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	log.Printf("listening on %s", addr)
	if err := s.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}
}

func loadConfig(path string) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, &cfg); err != nil {
		return err
	}
	streamMap = make(map[string]StreamConfig, len(cfg.Streams))
	for _, s := range cfg.Streams {
		absBase, err := filepath.Abs(s.SegmentsBase)
		if err != nil {
			return fmt.Errorf("stream %q: bad segments_base: %w", s.ID, err)
		}
		s.SegmentsBase = absBase
		streamMap[s.ID] = s
	}
	return nil
}

func withCommonHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Server", "hls-rehost-go/1")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if cfg.CORSAll {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Length,Content-Type,Accept-Ranges")
			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Range,If-Modified-Since,If-None-Match,Origin,Accept")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, "ok\n")
}

func manifestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	streamID := r.URL.Query().Get("s")
	if streamID == "" {
		http.Error(w, "missing ?s", http.StatusBadRequest)
		return
	}
	st, ok := streamMap[streamID]
	if !ok {
		http.Error(w, "unknown stream", http.StatusNotFound)
		return
	}

	var body []byte
	var err error

	if isHTTPURL(st.ManifestURL) {
		// HTTP(S) backend
		req, reqErr := http.NewRequestWithContext(r.Context(), http.MethodGet, st.ManifestURL, nil)
		if reqErr != nil {
			http.Error(w, "failed to build backend request", http.StatusInternalServerError)
			return
		}
		req.Header.Set("User-Agent", "hls-rehost-go")
		req.Header.Set("Accept", "*/*")

		resp, doErr := httpCli.Do(req)
		if doErr != nil {
			http.Error(w, "backend unreachable", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			http.Error(w, fmt.Sprintf("backend status: %s", resp.Status), http.StatusBadGateway)
			return
		}
		body, err = io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "failed to read backend body", http.StatusBadGateway)
			return
		}
	} else {
		// Локальный файл: абсолютный путь, относительный путь (относительно segments_base) или file://
		localPath, lpErr := resolveLocalManifestPath(st.ManifestURL, st.SegmentsBase)
		if lpErr != nil {
			http.Error(w, "bad manifest path", http.StatusBadRequest)
			return
		}
		f, openErr := os.Open(localPath)
		if openErr != nil {
			if os.IsNotExist(openErr) {
				http.NotFound(w, r)
				return
			}
			http.Error(w, "failed to open manifest", http.StatusInternalServerError)
			return
		}
		defer f.Close()
		body, err = io.ReadAll(f)
		if err != nil {
			http.Error(w, "failed to read manifest", http.StatusInternalServerError)
			return
		}
	}

	stripPDT := getBoolParam(r, "dt", "strip_pdt")
	removeLast := getBoolParam(r, "rl", "remove_last")
	adjustTime := getBoolParam(r, "at", "adjust_time")
	cleanTags := getBoolParam(r, "ct", "clean_tags")

	out := transformManifest(string(body), streamID, stripPDT, removeLast, adjustTime, cleanTags)

	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	w.Header().Set("Cache-Control", "no-store, must-revalidate")
	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		return
	}
	_, _ = io.WriteString(w, out)
}

func segmentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	streamID := r.URL.Query().Get("s")
	rel := r.URL.Query().Get("f")
	if streamID == "" || rel == "" {
		http.Error(w, "missing ?s or ?f", http.StatusBadRequest)
		return
	}
	st, ok := streamMap[streamID]
	if !ok {
		http.Error(w, "unknown stream", http.StatusNotFound)
		return
	}
	if u, err := url.QueryUnescape(rel); err == nil {
		rel = u
	}
	clean := filepath.ToSlash(filepath.Clean(rel))
	if strings.HasPrefix(clean, "/") || strings.Contains(clean, "..") {
		http.Error(w, "invalid file path", http.StatusBadRequest)
		return
	}
	full := filepath.Join(st.SegmentsBase, filepath.FromSlash(clean))

	if !pathWithinBase(full, st.SegmentsBase) {
		http.Error(w, "forbidden path", http.StatusForbidden)
		return
	}

	f, err := os.Open(full)
	if err != nil {
		if os.IsNotExist(err) {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "failed to open file", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}

	ctype := contentTypeFor(full)
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "public, max-age=300, immutable")
	http.ServeContent(w, r, filepath.Base(full), info.ModTime(), f)
}

func pathWithinBase(path string, base string) bool {
	ap, err1 := filepath.Abs(path)
	ab, err2 := filepath.Abs(base)
	if err1 != nil || err2 != nil {
		return false
	}
	ab = strings.TrimRight(ab, string(filepath.Separator)) + string(filepath.Separator)
	ap = strings.TrimRight(ap, string(filepath.Separator)) + string(filepath.Separator)
	return strings.HasPrefix(ap, ab)
}

func getBoolParam(r *http.Request, keys ...string) bool {
	q := r.URL.Query()
	for _, k := range keys {
		v := strings.ToLower(strings.TrimSpace(q.Get(k)))
		if v == "1" || v == "true" || v == "yes" || v == "on" {
			return true
		}
	}
	return false
}

// ----- Manifest transform -----

func transformManifest(src, streamID string, stripPDT, removeLast, adjustTime, cleanTags bool) string {
	lines := strings.Split(strings.ReplaceAll(src, "\r\n", "\n"), "\n")

	type entry struct {
		pdt *time.Time
		dur float64
		uri string // относительный путь из манифеста
	}

	var (
		versionLine  string
		mediaSeqLine string
		endlist      bool
		otherTopTags []string

		pendingPDT *time.Time
		pendingDur *float64
		entries    []entry
	)

	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		if line == "" {
			continue
		}

		if cleanTags && strings.HasPrefix(line, "#EXT-X-ALLOW-CACHE:") {
			continue
		}

		switch {
		case line == "#EXTM3U":
			// выведем в сборке
		case strings.HasPrefix(line, "#EXT-X-VERSION:"):
			versionLine = line
		case strings.HasPrefix(line, "#EXT-X-MEDIA-SEQUENCE:"):
			mediaSeqLine = line
		case strings.HasPrefix(line, "#EXT-X-TARGETDURATION:"):
			// пересчитаем сами
		case strings.HasPrefix(line, "#EXT-X-PROGRAM-DATE-TIME:"):
			if t, err := parsePDTTime(line); err == nil {
				pendingPDT = &t
			}
		case strings.HasPrefix(line, "#EXTINF:"):
			if d, ok := parseExtinfDuration(line); ok {
				pendingDur = &d
			}
		case strings.HasPrefix(line, "#EXT-X-ENDLIST"):
			endlist = true
		case strings.HasPrefix(line, "#EXT-X-MAP:"):
			otherTopTags = append(otherTopTags, rewriteMapURI(line, streamID))
		case strings.HasPrefix(line, "#"):
			otherTopTags = append(otherTopTags, line)
		default:
			// URI сегмента
			if pendingDur == nil {
				continue // защитимся от битых строк
			}
			e := entry{dur: *pendingDur, uri: line}
			if pendingPDT != nil {
				e.pdt = pendingPDT
			}
			entries = append(entries, e)
			pendingPDT = nil
			pendingDur = nil
		}
	}

	if removeLast && len(entries) > 0 {
		entries = entries[:len(entries)-1]
	}

	// ---- PDT заполнение/нормализация ----
	// Найдём первую известную PDT (если есть).
	seed := -1
	for i := range entries {
		if entries[i].pdt != nil {
			seed = i
			break
		}
	}
	if seed != -1 {
		// Вычислим PDT для первого сегмента, отталкиваясь от seed.
		t0 := *entries[seed].pdt
		for k := seed - 1; k >= 0; k-- {
			t0 = t0.Add(-time.Duration(entries[k].dur * float64(time.Second)))
		}
		// Если явно попросили adjust_time ИЛИ у первого не было PDT —
		// пересобираем всю шкалу, чтобы PDT был у каждого сегмента.
		if adjustTime || entries[0].pdt == nil {
			t := t0
			for i := range entries {
				tt := t
				entries[i].pdt = &tt
				t = t.Add(time.Duration(entries[i].dur * float64(time.Second)))
			}
		}
		// иначе оставляем исходные PDT там, где они были;
		// но гарантируем, что первый сегмент получит PDT (важно для LL-HLS).
		if entries[0].pdt == nil {
			t := t0
			tt := t
			entries[0].pdt = &tt
			// при желании можно заполнить и дальше, но оставляем как есть
		}
	}

	// ---- TARGETDURATION = ceil(max(#EXTINF)) ----
	maxDur := 0.0
	for _, e := range entries {
		if e.dur > maxDur {
			maxDur = e.dur
		}
	}
	td := int(math.Ceil(maxDur))
	if td <= 0 {
		td = 6
	}

	// ---- Сборка результата ----
	var out []string
	out = append(out, "#EXTM3U")
	if versionLine != "" {
		out = append(out, versionLine)
	}
	out = append(out, fmt.Sprintf("#EXT-X-TARGETDURATION:%d", td))
	if mediaSeqLine != "" {
		out = append(out, mediaSeqLine)
	}
	for _, t := range otherTopTags {
		if strings.HasPrefix(t, "#EXT-X-TARGETDURATION:") ||
			strings.HasPrefix(t, "#EXT-X-PROGRAM-DATE-TIME:") ||
			strings.HasPrefix(t, "#EXTINF:") {
			continue
		}
		out = append(out, t)
	}

	for _, e := range entries {
		if !stripPDT && e.pdt != nil {
			out = append(out, "#EXT-X-PROGRAM-DATE-TIME:"+e.pdt.UTC().Format(time.RFC3339Nano))
		}
		out = append(out, fmt.Sprintf("#EXTINF:%.3f,", e.dur))

		q := url.Values{}
		q.Set("s", streamID)
		q.Set("f", e.uri) // сохраняем относительный путь целиком
		out = append(out, "/segment?"+q.Encode())
	}

	if endlist {
		out = append(out, "#EXT-X-ENDLIST")
	}

	return strings.Join(out, "\n")
}

func parsePDTTime(pdtLine string) (time.Time, error) {
	s := strings.TrimSpace(strings.TrimPrefix(pdtLine, "#EXT-X-PROGRAM-DATE-TIME:"))
	return time.Parse(time.RFC3339Nano, s)
}

func parseExtinfDuration(line string) (float64, bool) {
	i := strings.Index(line, ":")
	if i == -1 {
		return 0, false
	}
	val := line[i+1:]
	if j := strings.Index(val, ","); j >= 0 {
		val = val[:j]
	}
	d, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
	return d, err == nil
}

// Переписываем EXT-X-MAP:URI="..." на /segment?s=...&f=<относительный путь>
func rewriteMapURI(tagLine, streamID string) string {
	const key = `URI="`
	idx := strings.Index(tagLine, key)
	if idx == -1 {
		return tagLine
	}
	start := idx + len(key)
	end := strings.Index(tagLine[start:], `"`)
	if end == -1 {
		return tagLine
	}
	uriVal := tagLine[start : start+end]
	q := url.Values{}
	q.Set("s", streamID)
	q.Set("f", uriVal)
	local := "/segment?" + q.Encode()
	return tagLine[:start] + local + tagLine[start+end:]
}

func contentTypeFor(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".mp4":
		// для CMAF/fMP4 сегментов это ок
		return "video/mp4"
	case ".m4s", ".cmfv", ".cmfa":
		return "video/iso.segment"
	default:
		if t := mime.TypeByExtension(ext); t != "" {
			return t
		}
		return "application/octet-stream"
	}
}

// ---- Helpers for manifest source selection ----

func isHTTPURL(s string) bool {
	u, err := url.Parse(s)
	if err != nil {
		return false
	}
	return u.Scheme == "http" || u.Scheme == "https"
}

func resolveLocalManifestPath(murl string, base string) (string, error) {
	// file:// URL
	if strings.HasPrefix(strings.ToLower(murl), "file://") {
		u, err := url.Parse(murl)
		if err != nil {
			return "", err
		}
		p := u.Path
		if up, err := url.PathUnescape(p); err == nil {
			p = up
		}
		if p == "" {
			return "", fmt.Errorf("empty file path")
		}
		if filepath.IsAbs(p) {
			return p, nil
		}
		return filepath.Join(base, p), nil
	}

	// Простой путь
	if filepath.IsAbs(murl) {
		return murl, nil
	}
	// относительный путь — относительно segments_base
	return filepath.Join(base, murl), nil
}
