package main

import (
    "encoding/json"
    "flag"
    "fmt"
    "log"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
    "sort"
    "strconv"
    "strings"
    "sync"
    "time"
)

type VideoInfo struct {
    Path              string
    SizeBytes         int64
    DurationSeconds   float64
    BitrateBps        *int64
    Width             *int
    Height            *int
}

func (v VideoInfo) SizeMB() float64 { return float64(v.SizeBytes) / (1024 * 1024) }
func (v VideoInfo) DurationMinutes() float64 {
    if v.DurationSeconds <= 0 {
        return 0
    }
    return v.DurationSeconds / 60
}
func (v VideoInfo) MBPerMinute() float64 {
    dm := v.DurationMinutes()
    if dm <= 0 {
        return 1e18
    }
    return v.SizeMB() / dm
}
func (v VideoInfo) BitrateMbps() *float64 {
    if v.BitrateBps == nil {
        return nil
    }
    mbps := float64(*v.BitrateBps) / 1_000_000.0
    return &mbps
}
func (v VideoInfo) ResolutionStr() string {
    if v.Width != nil && v.Height != nil {
        return fmt.Sprintf("%dx%d", *v.Width, *v.Height)
    }
    return "-"
}

var messages = map[string]map[string]string{
    "ru": {
        "scanning":             "Сканирую папку: %s",
        "found_files":          "Найдено видеофайлов: %d",
        "ffprobe_missing":      "Не найден ffprobe. Установите FFmpeg/ffprobe и добавьте в PATH.",
        "ffmpeg_missing":       "Не найден ffmpeg. Установите FFmpeg и добавьте в PATH.",
        "collecting_info":      "Сбор метаданных...",
        "listing_sorted":       "Сортировка по размеру на минуту (MB/мин), по убыванию:",
        "table_header":         "MB/мин | Размер (MB) | Длительность (мин) | Разрешение | Битрейт (Мбит/с) | Файл",
        "transcoding":          "Транскодирование: %s",
        "transcoded_ok":        "Готово: %s",
        "transcoded_fail":      "Ошибка при транскодировании: %s",
        "already_ok":           "Пропуск (соответствует требованиям): %s",
        "skipped_growing":      "Пропуск (файл растёт): %s",
        "skipped_locked":       "Пропуск (файл заблокирован): %s",
        "deleted_invalid":      "Удалён невалидный видеофайл: %s",
        "filter_active":        "Фильтр: только >= %.2f MB/мин. К транскодированию: %d/%d",
        "elapsed":              "Время: %.1f сек",
        "done":                 "Завершено.",
        "added_extensions":     "Добавлены дополнительные расширения: %s",
        "extension_conversions": "Настроены конверсии расширений: %s",
        "converting_extension": "Конвертирование %s в %s: %s",
    },
}

var videoExtensions = map[string]struct{}{
    ".mp4": {}, ".mkv": {}, ".mov": {}, ".avi": {}, ".webm": {}, ".m4v": {}, ".ts": {}, ".m2ts": {}, ".wmv": {}, ".flv": {}, ".3gp": {},
}

func which(cmd string) bool {
    _, err := exec.LookPath(cmd)
    return err == nil
}

func isVideoFile(path string, additional map[string]struct{}) bool {
    ext := strings.ToLower(filepath.Ext(path))
    if _, ok := videoExtensions[ext]; ok {
        fi, err := os.Stat(path)
        return err == nil && !fi.IsDir()
    }
    if additional != nil {
        if _, ok := additional[ext]; ok {
            fi, err := os.Stat(path)
            return err == nil && !fi.IsDir()
        }
    }
    return false
}

func iterVideoFiles(root string, recursive bool, additional map[string]struct{}) ([]string, error) {
    paths := []string{}
    if recursive {
        err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
            if err != nil {
                return nil
            }
            if d.IsDir() {
                return nil
            }
            if isVideoFile(path, additional) {
                paths = append(paths, path)
            }
            return nil
        })
        return paths, err
    }
    entries, err := os.ReadDir(root)
    if err != nil {
        return paths, err
    }
    for _, e := range entries {
        if e.IsDir() {
            continue
        }
        p := filepath.Join(root, e.Name())
        if isVideoFile(p, additional) {
            paths = append(paths, p)
        }
    }
    return paths, nil
}

func runFFProbe(path string) (map[string]any, string) {
    cmd := exec.Command("ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path)
    out, err := cmd.CombinedOutput()
    if err != nil {
        return nil, string(out)
    }
    var data map[string]any
    if jerr := json.Unmarshal(out, &data); jerr != nil {
        return nil, jerr.Error()
    }
    return data, ""
}

func toInt64Ptr(n int64) *int64 { return &n }
func toIntPtr(n int) *int { return &n }

func collectVideoInfo(path string, debug bool) *VideoInfo {
    fi, err := os.Stat(path)
    if err != nil {
        return nil
    }
    data, errStr := runFFProbe(path)
    if data == nil {
        if debug {
            log.Printf("ffprobe error for %s: %s", path, errStr)
        }
        return nil
    }
    var duration float64
    var bitrate *int64
    var width *int
    var height *int

    if fmtRaw, ok := data["format"].(map[string]any); ok {
        if ds, ok := fmtRaw["duration"].(string); ok {
            if f, err := strconv.ParseFloat(ds, 64); err == nil {
                duration = f
            }
        }
        if brs, ok := fmtRaw["bit_rate"].(string); ok {
            if n, err := strconv.ParseInt(brs, 10, 64); err == nil {
                bitrate = toInt64Ptr(n)
            }
        }
    }
    if streams, ok := data["streams"].([]any); ok {
        for _, s := range streams {
            sm, _ := s.(map[string]any)
            if sm == nil {
                continue
            }
            if ctyp, _ := sm["codec_type"].(string); ctyp == "video" {
                if w, ok := toIntFromAny(sm["width"]); ok {
                    width = toIntPtr(w)
                }
                if h, ok := toIntFromAny(sm["height"]); ok {
                    height = toIntPtr(h)
                }
                break
            }
        }
    }
    if bitrate == nil && duration > 0 {
        calc := int64(float64(fi.Size()*8) / duration)
        bitrate = &calc
    }
    return &VideoInfo{Path: path, SizeBytes: fi.Size(), DurationSeconds: duration, BitrateBps: bitrate, Width: width, Height: height}
}

func toIntFromAny(v any) (int, bool) {
    switch t := v.(type) {
    case float64:
        return int(t), true
    case int:
        return t, true
    case int64:
        return int(t), true
    default:
        return 0, false
    }
}

const (
    targetCodec   = "h264"
    targetBitrate = "2M"
)

func hasFFmpegEncoder(name string) bool {
    cmd := exec.Command("ffmpeg", "-hide_banner", "-encoders")
    out, err := cmd.CombinedOutput()
    if err != nil {
        return false
    }
    return strings.Contains(string(out), name)
}

func chooseEncoder(explicit string) string {
    if explicit != "" {
        // Respect explicit request only if encoder is actually available
        if hasFFmpegEncoder(explicit) {
            return explicit
        }
        fmt.Println("Запрошенный кодек недоступен, переключаюсь автоматически:", explicit)
    }
    if runtime.GOOS == "darwin" && hasFFmpegEncoder("h264_videotoolbox") {
        return "h264_videotoolbox"
    }
    if hasFFmpegEncoder("h264_nvenc") {
        return "h264_nvenc"
    }
    return "libx264"
}

func buildFFmpegCmd(inputPath, outputPath, encoder string) []string {
    preset := "medium"
    if encoder == "h264_nvenc" {
        preset = "p4"
    }
    return []string{
        "ffmpeg", "-hide_banner", "-y",
        "-i", inputPath,
        "-c:v", encoder,
        "-b:v", targetBitrate,
        "-maxrate", targetBitrate,
        "-bufsize", "16M",
        "-preset", preset,
        "-c:a", "aac", "-b:a", "128k",
        "-map_metadata", "0",
        outputPath,
    }
}

func buildFFmpegCmdAudioTranscode(inputPath, outputPath, encoder string) []string {
    preset := "medium"
    if encoder == "h264_nvenc" {
        preset = "p4"
    }
    return []string{
        "ffmpeg", "-hide_banner", "-y",
        "-i", inputPath,
        "-c:v", encoder,
        "-b:v", targetBitrate,
        "-maxrate", targetBitrate,
        "-bufsize", "16M",
        "-preset", preset,
        "-c:a", "aac", "-b:a", "128k",
        "-map_metadata", "0",
        outputPath,
    }
}

func isFileGrowing(path string, interval time.Duration, repeats int) bool {
    fi, err := os.Stat(path)
    if err != nil {
        return false
    }
    prev := fi.Size()
    for i := 0; i < repeats; i++ {
        time.Sleep(interval)
        fi2, err := os.Stat(path)
        if err != nil {
            return false
        }
        cur := fi2.Size()
        if cur != prev {
            return true
        }
        prev = cur
    }
    return false
}

func canAcquireExclusiveLock(path string) bool {
    f, err := os.OpenFile(path, os.O_RDWR, 0)
    if err != nil {
        return false
    }
    defer f.Close()
    // Try unix flock if available
    if runtime.GOOS != "windows" {
        // best-effort: use syscall to acquire non-blocking exclusive lock
        type fdI interface{ Fd() uintptr }
        if _, ok := any(f).(fdI); ok {
            // Avoid importing deprecated syscall; rely on shelling to flock is overkill. Keep heuristic: file opened OK => treat as lockable.
            return true
        }
    }
    return true
}

type result struct{ ok, skipped bool }

var allowDeleteInvalid bool

func transcodeVideo(filePath string, debug bool, force bool, codec string, extConv map[string]string) (bool, bool) {
    texts := messages["ru"]
    data, _ := runFFProbe(filePath)
    if data == nil {
        if !isFileGrowing(filePath, time.Second, 2) && canAcquireExclusiveLock(filePath) {
            if allowDeleteInvalid {
                _ = os.Remove(filePath)
                fmt.Println(fmt.Sprintf(texts["deleted_invalid"], filePath))
            } else {
                fmt.Println("Пропуск (невозможно прочитать метаданные):", filePath)
            }
        }
        return true, true
    }
    var videoStream map[string]any
    if streams, ok := data["streams"].([]any); ok {
        for _, s := range streams {
            sm, _ := s.(map[string]any)
            if sm == nil {
                continue
            }
            if ctyp, _ := sm["codec_type"].(string); ctyp == "video" {
                videoStream = sm
                break
            }
        }
    }
    if videoStream == nil {
        if !isFileGrowing(filePath, time.Second, 2) && canAcquireExclusiveLock(filePath) {
            if allowDeleteInvalid {
                _ = os.Remove(filePath)
                fmt.Println(fmt.Sprintf(texts["deleted_invalid"], filePath))
            } else {
                fmt.Println("Пропуск (не найден видеопоток):", filePath)
            }
        }
        return true, true
    }

    currentCodec, _ := videoStream["codec_name"].(string)
    var bitrateMbps float64
    if fmtRaw, ok := data["format"].(map[string]any); ok {
        if brs, ok := fmtRaw["bit_rate"].(string); ok {
            if n, err := strconv.ParseInt(brs, 10, 64); err == nil {
                bitrateMbps = float64(n) / 1_000_000.0
            }
        }
    }

    curExt := strings.ToLower(filepath.Ext(filePath))
    needsExtConv := false
    if extConv != nil {
        _, needsExtConv = extConv[curExt]
    }
    if !force && !needsExtConv && currentCodec == targetCodec && bitrateMbps <= 10 {
        fmt.Println(fmt.Sprintf(texts["already_ok"], filePath))
        return true, true
    }
    if isFileGrowing(filePath, time.Second, 2) {
        fmt.Println(fmt.Sprintf(texts["skipped_growing"], filePath))
        return true, true
    }
    if !canAcquireExclusiveLock(filePath) {
        fmt.Println(fmt.Sprintf(texts["skipped_locked"], filePath))
        return true, true
    }

    targetExt := curExt
    if tgt, ok := extConv[curExt]; ok && tgt != "" {
        targetExt = tgt
        fmt.Println(fmt.Sprintf(texts["converting_extension"], curExt, targetExt, filePath))
    }

    tempOutput := filepath.Join(filepath.Dir(filePath), fmt.Sprintf("temp_%s", filepath.Base(filePath)))
    if targetExt != curExt {
        base := strings.TrimSuffix(filepath.Base(filePath), curExt)
        tempOutput = filepath.Join(filepath.Dir(filePath), fmt.Sprintf("temp_%s%s", base, targetExt))
    }
    _ = os.Remove(tempOutput)

    encoder := chooseEncoder(codec)
    cmdArgs := buildFFmpegCmd(filePath, tempOutput, encoder)
    if debug {
        fmt.Println("Команда FFmpeg:", strings.Join(cmdArgs, " "))
    }
    start := time.Now()
    cmd := exec.Command(cmdArgs[0], cmdArgs[1:]...)
    out, err := cmd.CombinedOutput()
    if err == nil {
        _ = os.Remove(filePath)
        finalOutput := filePath
        if targetExt != curExt {
            finalOutput = strings.TrimSuffix(filePath, curExt) + targetExt
        }
        _ = os.Rename(tempOutput, finalOutput)
        fmt.Println(fmt.Sprintf(texts["elapsed"], time.Since(start).Seconds()))
        return true, false
    }
    // Print error details. If -debug is enabled, print the full output; otherwise, a short summary
    if debug {
        fmt.Println("FFmpeg ошибка (полная):")
        fmt.Println(string(out))
    } else {
        errSummary := string(out)
        if len(errSummary) > 400 {
            errSummary = errSummary[:400] + "..."
        }
        fmt.Println("FFmpeg ошибка:", errSummary)
    }

    // Retry with audio transcoding (AAC) keeping the same video encoder
    _ = os.Remove(tempOutput)
    cmdArgs2 := buildFFmpegCmdAudioTranscode(filePath, tempOutput, encoder)
    if debug {
        fmt.Println("Retry with audio transcode:", strings.Join(cmdArgs2, " "))
    }
    start2 := time.Now()
    cmd2 := exec.Command(cmdArgs2[0], cmdArgs2[1:]...)
    out2, err2 := cmd2.CombinedOutput()
    if err2 == nil {
        _ = os.Remove(filePath)
        finalOutput := filePath
        if targetExt != curExt {
            finalOutput = strings.TrimSuffix(filePath, curExt) + targetExt
        }
        _ = os.Rename(tempOutput, finalOutput)
        fmt.Println(fmt.Sprintf(texts["elapsed"], time.Since(start2).Seconds()))
        return true, false
    }
    if debug {
        fmt.Println(string(out2))
    }

    // Final fallback: libx264 + audio transcode
    if encoder != "libx264" {
        _ = os.Remove(tempOutput)
        fb := buildFFmpegCmdAudioTranscode(filePath, tempOutput, "libx264")
        if debug {
            fmt.Println("Retry with libx264 + audio transcode:", strings.Join(fb, " "))
        }
        start3 := time.Now()
        cmd3 := exec.Command(fb[0], fb[1:]...)
        out3, err3 := cmd3.CombinedOutput()
        if err3 == nil {
            _ = os.Remove(filePath)
            finalOutput := filePath
            if targetExt != curExt {
                finalOutput = strings.TrimSuffix(filePath, curExt) + targetExt
            }
            _ = os.Rename(tempOutput, finalOutput)
            fmt.Println(fmt.Sprintf(texts["elapsed"], time.Since(start3).Seconds()))
            return true, false
        }
        if debug {
            fmt.Println(string(out3))
        }
    }
    _ = os.Remove(tempOutput)
    return false, false
}

type stringSlice []string
func (s *stringSlice) String() string { return strings.Join(*s, ",") }
func (s *stringSlice) Set(v string) error { *s = append(*s, v); return nil }

func toExtSet(items []string) map[string]struct{} {
    if len(items) == 0 {
        return nil
    }
    m := make(map[string]struct{}, len(items))
    for _, e := range items {
        if e == "" { continue }
        if !strings.HasPrefix(e, ".") { e = "." + e }
        m[strings.ToLower(e)] = struct{}{}
    }
    return m
}

func parseConversions(items []string) map[string]string {
    if len(items) == 0 {
        return nil
    }
    m := make(map[string]string)
    for _, c := range items {
        if c == "" { continue }
        parts := strings.SplitN(c, ":", 2)
        if len(parts) != 2 { continue }
        s := parts[0]
        t := parts[1]
        if !strings.HasPrefix(s, ".") { s = "." + s }
        if !strings.HasPrefix(t, ".") { t = "." + t }
        m[strings.ToLower(s)] = strings.ToLower(t)
    }
    return m
}

func main() {
    var dirFlag = flag.String("dir", ".", "Каталог для сканирования")
    var dryFlag = flag.Bool("dryrun", false, "Только показать список без транскодирования")
    var limitFlag = flag.Int("limit", 0, "Ограничить количество файлов (0 = без ограничений)")
    var debugFlag = flag.Bool("debug", false, "Подробные сообщения")
    var forceFlag = flag.Bool("force", false, "Принудительно транскодировать")
    var codecFlag = flag.String("codec", "", "Явно указать видеокодек")
    var delInvalidFlag = flag.Bool("delete-invalid", false, "Удалять заведомо невалидные видеофайлы (по умолчанию выключено)")
    var thrFlag = flag.Float64("min-mb-per-min", 0.0, "Фильтр: транскодировать только файлы с MB/мин >= порога")
    var loopFlag = flag.Bool("loop", false, "Бесконечный режим")
    var loopSleepFlag = flag.Int("loop-sleep", 60, "Пауза между итерациями (сек)")
    var recursiveFlag = flag.Bool("recursive", false, "Рекурсивное сканирование")
    var jobsFlag = flag.Int("jobs", 1, "Количество одновременных процессов ffmpeg")
    var addExt stringSlice
    flag.Var(&addExt, "add-ext", "Добавить расширение (можно повторять)")
    var convExt stringSlice
    flag.Var(&convExt, "convert-ext", "Конвертировать расширение (источник:цель), можно повторять")
    flag.Parse()

    texts := messages["ru"]
    allowDeleteInvalid = *delInvalidFlag

    if !which("ffprobe") {
        fmt.Println(texts["ffprobe_missing"])
        os.Exit(1)
    }
    if !which("ffmpeg") {
        fmt.Println(texts["ffmpeg_missing"])
        os.Exit(1)
    }

    root, _ := filepath.Abs(*dirFlag)

    addSet := toExtSet(addExt)
    if len(addSet) > 0 {
        list := make([]string, 0, len(addSet))
        for k := range addSet { list = append(list, k) }
        sort.Strings(list)
        fmt.Println(fmt.Sprintf(texts["added_extensions"], strings.Join(list, ", ")))
    }
    convMap := parseConversions(convExt)
    if len(convMap) > 0 {
        pairs := make([]string, 0, len(convMap))
        for s, t := range convMap { pairs = append(pairs, fmt.Sprintf("%s→%s", s, t)) }
        sort.Strings(pairs)
        fmt.Println(fmt.Sprintf(texts["extension_conversions"], strings.Join(pairs, ", ")))
    }

    for {
        fmt.Println(fmt.Sprintf(texts["scanning"], root))
        files, err := iterVideoFiles(root, *recursiveFlag, addSet)
        if err != nil {
            log.Printf("Ошибка при сканировании: %v", err)
            files = nil
        }
        fmt.Println(fmt.Sprintf(texts["found_files"], len(files)))

        fmt.Println(texts["collecting_info"])
        infos := make([]*VideoInfo, 0, len(files))
        for _, p := range files {
            if vi := collectVideoInfo(p, *debugFlag); vi != nil {
                infos = append(infos, vi)
            }
        }

        sort.Slice(infos, func(i, j int) bool {
            a, b := infos[i], infos[j]
            // sort by MB/min desc, then by duration asc
            d := a.MBPerMinute() - b.MBPerMinute()
            if d == 0 {
                return a.DurationMinutes() < b.DurationMinutes()
            }
            return d > 0
        })

        if len(infos) > 0 {
            fmt.Println(texts["listing_sorted"])
            fmt.Println(texts["table_header"])
            for _, v := range infos {
                var brStr string
                if b := v.BitrateMbps(); b != nil {
                    brStr = fmt.Sprintf("%.2f", *b)
                } else {
                    brStr = "-"
                }
                fmt.Printf("%6.2f | %10.2f | %14.2f | %10s | %14s | %s\n", v.MBPerMinute(), v.SizeMB(), v.DurationMinutes(), v.ResolutionStr(), brStr, v.Path)
            }
        }

        thr := *thrFlag
        filtered := make([]*VideoInfo, 0, len(infos))
        for _, v := range infos {
            if v.MBPerMinute() >= thr {
                filtered = append(filtered, v)
            }
        }
        if thr > 0 {
            fmt.Println(fmt.Sprintf(texts["filter_active"], thr, len(filtered), len(infos)))
        } else {
            filtered = infos
        }

        if *dryFlag {
            fmt.Println(texts["done"])
            if !*loopFlag { return }
            time.Sleep(time.Duration(max(1, *loopSleepFlag)) * time.Second)
            continue
        }

        toProcess := filtered
        if *limitFlag > 0 && *limitFlag < len(filtered) {
            toProcess = filtered[:*limitFlag]
        }

        enc := *codecFlag
        if *jobsFlag <= 1 {
            for _, v := range toProcess {
                fmt.Println(fmt.Sprintf(texts["transcoding"], v.Path))
                ok, skipped := transcodeVideo(v.Path, *debugFlag, *forceFlag, enc, convMap)
                if ok && !skipped { fmt.Println(fmt.Sprintf(texts["transcoded_ok"], v.Path)) }
                if !ok { fmt.Println(fmt.Sprintf(texts["transcoded_fail"], v.Path)) }
            }
        } else {
            // Parallel workers
            type job struct{ path string }
            jobs := make(chan job, len(toProcess))
            var wg sync.WaitGroup
            workers := max(1, *jobsFlag)
            for i := 0; i < workers; i++ {
                wg.Add(1)
                go func() {
                    defer wg.Done()
                    for j := range jobs {
                        fmt.Println(fmt.Sprintf(texts["transcoding"], j.path))
                        ok, skipped := transcodeVideo(j.path, *debugFlag, *forceFlag, enc, convMap)
                        if ok && !skipped { fmt.Println(fmt.Sprintf(texts["transcoded_ok"], j.path)) } else if !ok { fmt.Println(fmt.Sprintf(texts["transcoded_fail"], j.path)) }
                    }
                }()
            }
            for _, v := range toProcess { jobs <- job{v.Path} }
            close(jobs)
            wg.Wait()
        }

        fmt.Println(texts["done"])
        if !*loopFlag { return }
        time.Sleep(time.Duration(max(1, *loopSleepFlag)) * time.Second)
    }
}

func max(a, b int) int { if a > b { return a }; return b }

