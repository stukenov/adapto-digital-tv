package main

import (
    "bufio"
    "errors"
    "flag"
    "fmt"
    "io"
    "log"
    "net/url"
    "os"
    "path/filepath"
    "strconv"
    "strings"
    "time"
)

type Config struct {
    sourcesDir   string
    sleepSeconds int
    urlPrefix    string
    urlSegment   string
    once         bool
    checkInUse   bool
    ioRateBytesPerSec int64
}

var cfg Config

// normalizePath converts URL-like inputs to local paths and decodes URL-encoded characters.
func normalizePath(pathStr string) string {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Ошибка при нормализации пути %s: %v", pathStr, r)
        }
    }()

    if pathStr == "" {
        return pathStr
    }

    // Decode percent-encoded characters in path
    if unescaped, err := url.PathUnescape(pathStr); err == nil {
        pathStr = unescaped
    }

    // Convert URL to local path if needed
    if strings.HasPrefix(pathStr, "http://") || strings.HasPrefix(pathStr, "https://") {
        parsed, err := url.Parse(pathStr)
        if err != nil {
            log.Printf("Ошибка при разборе URL %s: %v", pathStr, err)
            return pathStr
        }
        parts := strings.Split(parsed.EscapedPath(), "/")
        // find configured segment and take everything after it
        idx := -1
        for i, p := range parts {
            if p == cfg.urlSegment {
                idx = i
                break
            }
        }
        if idx >= 0 {
            parts = parts[idx+1:]
        }
        // join and prefix with /srv
        joined := strings.Join(filterNonEmpty(parts), "/")
        // Use configured prefix
        prefix := cfg.urlPrefix
        if strings.HasSuffix(prefix, "/") {
            prefix = strings.TrimSuffix(prefix, "/")
        }
        local := prefix + "/" + joined
        // adapt to current OS path separators
        return filepath.FromSlash(local)
    }
    return pathStr
}

func filterNonEmpty(in []string) []string {
    out := make([]string, 0, len(in))
    for _, s := range in {
        if s != "" {
            // Also unescape any segment individually
            if us, err := url.PathUnescape(s); err == nil {
                s = us
            }
            out = append(out, s)
        }
    }
    return out
}

// getFolderPairs reads sources/*.txt near the executable and returns [src, dst] pairs.
func getFolderPairs() [][2]string {
    pairs := make([][2]string, 0)

    sourcesDir := cfg.sourcesDir
    log.Printf("Чтение файлов из директории: %s", sourcesDir)

    dirEntries, err := os.ReadDir(sourcesDir)
    if err != nil {
        if os.IsNotExist(err) {
            log.Printf("Директория sources не существует")
            return pairs
        }
        log.Printf("Ошибка чтения директории sources: %v", err)
        return pairs
    }

    for _, de := range dirEntries {
        if de.IsDir() {
            continue
        }
        name := de.Name()
        if !strings.HasSuffix(strings.ToLower(name), ".txt") {
            continue
        }
        p := filepath.Join(sourcesDir, name)
        f, err := os.Open(p)
        if err != nil {
            log.Printf("Ошибка при чтении файла %s: %v", p, err)
            continue
        }
        scanner := bufio.NewScanner(f)
        var lines []string
        for scanner.Scan() {
            lines = append(lines, strings.TrimSpace(scanner.Text()))
        }
        f.Close()
        if err := scanner.Err(); err != nil {
            log.Printf("Ошибка при сканировании файла %s: %v", p, err)
            continue
        }
        if len(lines) < 2 {
            log.Printf("Файл %s имеет неверный формат", p)
            continue
        }
        src := normalizePath(lines[0])
        dst := normalizePath(lines[1])
        // Validate by cleaning; if results are non-empty, accept
        if src == "" || dst == "" {
            log.Printf("Некорректный формат пути в файле %s", p)
                        continue
        }
        _src := filepath.Clean(src)
        _dst := filepath.Clean(dst)
        pairs = append(pairs, [2]string{_src, _dst})
        log.Printf("Добавлена пара путей: %s -> %s", _src, _dst)
    }

    return pairs
}

// moveItem moves file or directory from src to dst. Returns true on success.
func moveItem(src, dst string) bool {
    log.Printf("Начало операции перемещения из %s в %s", src, dst)

    src = normalizePath(src)
    dst = normalizePath(dst)

    if src == "" || dst == "" {
        log.Printf("Некорректный формат пути")
        return false
    }

    srcInfo, err := os.Lstat(src)
    if err != nil {
        if os.IsNotExist(err) {
            log.Printf("Путь не существует: %s", src)
            return false
        }
        log.Printf("Не удалось получить информацию о пути %s: %v", src, err)
        return false
    }

    // Ensure destination parent exists
    if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
        log.Printf("Не удалось создать директорию назначения: %v", err)
        return false
    }

    // Perform move with cross-device support
    if srcInfo.IsDir() {
        if cfg.checkInUse {
            if isFolderInUse(src) {
                log.Printf("Папка используется: %s", src)
                return false
            }
        }
        if err := moveDir(src, dst); err != nil {
            log.Printf("Ошибка при перемещении %s: %v", src, err)
            return false
        }
        log.Printf("Перемещена папка: %s -> %s", src, dst)
        return true
    }
    if cfg.checkInUse {
        if isFileInUse(src) {
            log.Printf("Файл используется: %s", src)
            return false
        }
    }
    if err := moveFile(src, dst); err != nil {
        log.Printf("Ошибка при перемещении %s: %v", src, err)
        return false
    }
    log.Printf("Перемещен файл: %s -> %s", src, dst)
    return true
}

func isFileInUse(path string) bool {
    // Try opening for read/write; on Windows this commonly fails if another process holds a lock without sharing
    f, err := os.OpenFile(path, os.O_RDWR, 0)
    if err != nil {
        return true
    }
    _ = f.Close()
    return false
}

func isFolderInUse(path string) bool {
    // Heuristic: if any file inside cannot be opened for read/write, consider folder in use
    entries, err := os.ReadDir(path)
    if err != nil {
        return true
    }
    for _, e := range entries {
        p := filepath.Join(path, e.Name())
        if e.IsDir() {
            if isFolderInUse(p) {
                return true
            }
                    continue
        }
        if isFileInUse(p) {
            return true
        }
    }
    return false
}

func moveFile(src, dst string) error {
    // Try simple rename first
    if err := os.Rename(src, dst); err == nil {
        return nil
    } else if !errors.Is(err, os.ErrInvalid) {
        // If error is EXDEV (cross-device), fallback to copy-remove. We detect by error message substring due to portability.
        if !isCrossDeviceErr(err) {
            // Could be permission/in-use; surface error
            // Attempt to copy only for cross-device
            return err
        }
    }

    // If destination exists with identical size, remove source and return success
    if dstInfo, err := os.Stat(dst); err == nil {
        if srcInfo2, err2 := os.Stat(src); err2 == nil && dstInfo.Size() == srcInfo2.Size() {
            if err := os.Remove(src); err != nil {
                return fmt.Errorf("файл назначения уже существует с тем же размером, но не удалось удалить исходный: %w", err)
            }
            return nil
        }
    }

    // Copy file contents
    if err := copyFile(src, dst); err != nil {
        return err
    }
    // Remove original
    if err := os.Remove(src); err != nil {
        return fmt.Errorf("после копирования не удалось удалить исходный файл: %w", err)
    }
    return nil
}

func moveDir(src, dst string) error {
    if err := os.Rename(src, dst); err == nil {
        return nil
    } else if !isCrossDeviceErr(err) {
        return err
    }
    // Cross-device: copy recursively then remove original
    if err := copyDir(src, dst); err != nil {
        return err
    }
    if err := os.RemoveAll(src); err != nil {
        return fmt.Errorf("после копирования не удалось удалить исходную папку: %w", err)
    }
    return nil
}

func isCrossDeviceErr(err error) bool {
    if err == nil {
        return false
    }
    // Detect common substrings for EXDEV across platforms
    s := strings.ToLower(err.Error())
    return strings.Contains(s, "cross-device") || strings.Contains(s, "invalid cross-device") || strings.Contains(s, "device or resource busy: rename")
}

func copyFile(src, dst string) error {
    // Determine expected size of source file
    srcInfo, err := os.Stat(src)
    if err != nil {
        return err
    }
    expectedSize := srcInfo.Size()

    in, err := os.Open(src)
    if err != nil {
        return err
    }
    defer in.Close()

    // Ensure dest parent exists
    if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
        return err
    }

    out, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer func() {
        cerr := out.Close()
        if err == nil {
            err = cerr
        }
    }()

    if cfg.ioRateBytesPerSec > 0 {
        if err = copyWithRateLimit(out, in, cfg.ioRateBytesPerSec); err != nil {
            return err
        }
    } else {
        if _, err = io.Copy(out, in); err != nil {
            return err
        }
    }

    // Ensure data is flushed and size matches source
    _ = out.Sync()

    if dstInfo, err2 := os.Stat(dst); err2 == nil {
        if dstInfo.Size() != expectedSize {
            _ = out.Close()
            _ = os.Remove(dst)
            return fmt.Errorf("некорректный размер назначения: ожидалось %d, получено %d", expectedSize, dstInfo.Size())
        }
    }

    // Try to copy mode bits
    if fi, err2 := os.Stat(src); err2 == nil {
        _ = os.Chmod(dst, fi.Mode())
    }
    return nil
}

// copyWithRateLimit copies from r to w limiting throughput to maxBytesPerSec (best-effort).
func copyWithRateLimit(w io.Writer, r io.Reader, maxBytesPerSec int64) error {
    if maxBytesPerSec <= 0 {
        _, err := io.Copy(w, r)
        return err
    }
    const minChunk = 32 * 1024
    chunkSize := minChunk
    if maxBytesPerSec < int64(minChunk) {
        chunkSize = int(maxBytesPerSec)
        if chunkSize <= 0 {
            chunkSize = 1
        }
    } else if maxBytesPerSec < 4*1024*1024 {
        // for moderate rates, scale chunk size to ~20 chunks/sec
        chunkSize = int(maxBytesPerSec / 20)
        if chunkSize < minChunk {
            chunkSize = minChunk
        }
        if chunkSize > 2*1024*1024 {
            chunkSize = 2 * 1024 * 1024
        }
    } else {
        // for high rates, use larger chunks
        chunkSize = 2 * 1024 * 1024
    }

    buf := make([]byte, chunkSize)
    var bytesThisSecond int64
    start := time.Now()
    for {
        n, readErr := r.Read(buf)
        if n > 0 {
            if _, writeErr := w.Write(buf[:n]); writeErr != nil {
                return writeErr
            }
            bytesThisSecond += int64(n)
            if bytesThisSecond >= maxBytesPerSec {
                elapsed := time.Since(start)
                if elapsed < time.Second {
                    time.Sleep(time.Second - elapsed)
                }
                start = time.Now()
                bytesThisSecond = 0
            }
        }
        if readErr != nil {
            if readErr == io.EOF {
                return nil
            }
            return readErr
        }
    }
}

func copyDir(src, dst string) error {
    // Walk src and replicate at dst, deleting each source file after successful copy
    return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
        if err != nil {
            return err
        }
        rel, err := filepath.Rel(src, path)
        if err != nil {
            return err
        }
        target := filepath.Join(dst, rel)
        if d.IsDir() {
            return os.MkdirAll(target, 0o755)
        }
        if err := copyFile(path, target); err != nil {
            return err
        }
        if err := os.Remove(path); err != nil {
            return fmt.Errorf("после копирования не удалось удалить исходный файл '%s': %w", path, err)
        }
        return nil
    })
}

func processFolders() {
    log.Printf("Запуск процесса обработки папок")
    for {
        func() {
            log.Printf("Начало нового цикла обработки")
            pairs := getFolderPairs()
            log.Printf("Получено пар папок для обработки: %d", len(pairs))

            for _, pair := range pairs {
                srcFolder := normalizePath(pair[0])
                dstFolder := normalizePath(pair[1])

                // Validate src exists
                srcInfo, err := os.Stat(srcFolder)
                if err != nil || !srcInfo.IsDir() {
                    log.Printf("Исходная папка не существует: %s", srcFolder)
                    continue
                }

                // Walk recursively and move files only
                err = filepath.WalkDir(srcFolder, func(path string, d os.DirEntry, err error) error {
                    if err != nil {
                        log.Printf("Ошибка доступа к %s: %v", path, err)
                        return nil
                    }
                    if d.IsDir() {
                        return nil
                    }
                    rel, rerr := filepath.Rel(srcFolder, path)
                    if rerr != nil {
                        log.Printf("Ошибка расчета относительного пути для %s: %v", path, rerr)
                        return nil
                    }
                    dstPath := filepath.Join(dstFolder, rel)
                    if cfg.checkInUse && isFileInUse(path) {
                        log.Printf("Файл используется, пропуск: %s", path)
                        return nil
                    }
                    if dstInfo, statErr := os.Stat(dstPath); statErr == nil {
                        // Destination exists: compare sizes
                        if srcInfo, err2 := os.Stat(path); err2 == nil && dstInfo.Size() == srcInfo.Size() {
                            // Sizes equal: delete source to honor move semantics
                            if remErr := os.Remove(path); remErr != nil {
                                log.Printf("Не удалось удалить исходный файл (существует такой же в назначении): %s: %v", path, remErr)
                            }
                            return nil
                        }
                        // Different size - proceed to move/overwrite logic below by continuing
                    }
                    _ = moveItem(path, dstPath)
                    return nil
                })
                if err != nil {
                    log.Printf("Ошибка при обходе папки %s: %v", srcFolder, err)
                }
            }
        }()

        if cfg.once {
            log.Printf("Цикл обработки завершен (одиночный режим)")
            return
        }
        log.Printf("Цикл обработки завершен, пауза %d секунд", cfg.sleepSeconds)
        time.Sleep(time.Duration(cfg.sleepSeconds) * time.Second)
    }
}

// parseIoRate parses human-friendly throughput strings like "512k", "1m", "1mb", "2g", or raw bytes.
// Returns bytes per second.
func parseIoRate(input string) (int64, error) {
    s := strings.TrimSpace(strings.ToLower(input))
    if s == "" {
        return 0, nil
    }
    // Evaluate suffixes longest-first
    type suff struct {
        s string
        m int64
    }
    suffixes := []suff{
        {"gib", 1 << 30}, {"gb", 1 << 30}, {"g", 1 << 30},
        {"mib", 1 << 20}, {"mb", 1 << 20}, {"m", 1 << 20},
        {"kib", 1 << 10}, {"kb", 1 << 10}, {"k", 1 << 10},
        {"b", 1},
    }
    mult := int64(1)
    for _, su := range suffixes {
        if strings.HasSuffix(s, su.s) {
            s = strings.TrimSuffix(s, su.s)
            mult = su.m
            break
        }
    }
    // Allow spaces after trimming suffix
    s = strings.TrimSpace(s)
    if s == "" {
        return 0, fmt.Errorf("пустое значение после суффикса в io-rate")
    }
    // Parse integer value
    n, err := strconv.ParseInt(s, 10, 64)
    if err != nil {
        return 0, err
    }
    if n < 0 {
        return 0, fmt.Errorf("io-rate должен быть положительным: %d", n)
    }
    return n * mult, nil
}

func main() {
    // Flags
    var (
        sourcesFlag = flag.String("sources", defaultSourcesDir(), "Путь к директории с .txt файлами (по умолчанию ./sources)")
        sleepFlag   = flag.Int("sleep", 10, "Пауза между циклами в секундах")
        prefixFlag  = flag.String("url-prefix", "/srv", "Префикс локального пути для URL")
        segmentFlag = flag.String("url-segment", "files", "Сегмент URL, после которого берется локальный путь")
        onceFlag    = flag.Bool("once", false, "Выполнить один цикл и завершить")
        inuseFlag   = flag.Bool("check-in-use", false, "Проверять и пропускать файлы/папки, которые используются")
        ioRateFlag  = flag.String("io-rate", "", "Ограничить скорость копирования, например: 512k, 2m, 1048576 (байт/сек)")
    )
    flag.Parse()

    var ioRate int64
    if *ioRateFlag != "" {
        if n, err := parseIoRate(*ioRateFlag); err != nil {
            log.Printf("Не удалось разобрать io-rate='%s': %v", *ioRateFlag, err)
        } else {
            ioRate = n
        }
    }

    cfg = Config{
        sourcesDir:   *sourcesFlag,
        sleepSeconds: *sleepFlag,
        urlPrefix:    *prefixFlag,
        urlSegment:   *segmentFlag,
        once:         *onceFlag,
        checkInUse:   *inuseFlag,
        ioRateBytesPerSec: ioRate,
    }

    log.Printf("Запуск программы")
    processFolders()
}

func defaultSourcesDir() string {
    // Default to ./sources relative to current working directory
    return filepath.Join(".", "sources")
}


