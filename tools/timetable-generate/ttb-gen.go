package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Messages map[string]string

var MESSAGES = map[string]Messages{
	"ru": {
		"ffprobe_missing": "Не найден ffprobe. Установите FFmpeg/ffprobe и добавьте в PATH.",
		"collecting":      "Сбор длительности файлов...",
		"writing":         "Запись плейлиста...",
		"summary":         "Генерация завершена.",
	},
	"kk": {
		"ffprobe_missing": "ffprobe табылмады. FFmpeg/ffprobe орнатып, PATH-қа қосыңыз.",
		"collecting":      "Файлдардың ұзақтығын жинау...",
		"writing":         "Плейлист жазылуда...",
		"summary":         "Генерация аяқталды.",
	},
}

var VIDEO_EXTENSIONS = map[string]bool{
	".mp4":  true,
	".mkv":  true,
	".mov":  true,
	".avi":  true,
	".webm": true,
	".m4v":  true,
	".ts":   true,
	".m2ts": true,
	".wmv":  true,
	".flv":  true,
	".3gp":  true,
}

// Global options for path rewrite
var pathPrefixFrom string
var pathPrefixTo string

func mapToHostPath(originalPath string) string {
	if pathPrefixFrom == "" || pathPrefixTo == "" {
		return originalPath
	}

	cleanFrom := filepath.Clean(pathPrefixFrom)
	cleanSrc := filepath.Clean(originalPath)
	if rel, err := filepath.Rel(cleanFrom, cleanSrc); err == nil && !strings.HasPrefix(rel, "..") {
		return filepath.Join(pathPrefixTo, rel)
	}
	return originalPath
}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isVideoFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return VIDEO_EXTENSIONS[ext]
}

func iterVideoFiles(root string, recursive bool) ([]string, error) {
	var files []string
	
	if recursive {
		err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && isVideoFile(path) {
				files = append(files, path)
			}
			return nil
		})
		return files, err
	} else {
		entries, err := os.ReadDir(root)
		if err != nil {
			return files, err
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				path := filepath.Join(root, entry.Name())
				if isVideoFile(path) {
					files = append(files, path)
				}
			}
		}
		return files, nil
	}
}

func parseFraction(value string) *float64 {
	if strings.Contains(value, "/") {
		parts := strings.Split(value, "/")
		if len(parts) != 2 {
			return nil
		}
		num, err1 := strconv.ParseFloat(parts[0], 64)
		den, err2 := strconv.ParseFloat(parts[1], 64)
		if err1 != nil || err2 != nil || den == 0 {
			return nil
		}
		result := num / den
		return &result
	}
	result, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return nil
	}
	return &result
}

type FFProbeData struct {
	Format  FFProbeFormat   `json:"format"`
	Streams []FFProbeStream `json:"streams"`
}

type FFProbeFormat struct {
	Duration string `json:"duration"`
}

type FFProbeStream struct {
	CodecType     string `json:"codec_type"`
	AvgFrameRate  string `json:"avg_frame_rate"`
	RFrameRate    string `json:"r_frame_rate"`
}

func runFFProbe(filePath string) (*float64, *float64) {
	cmd := exec.Command("ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath)
	output, err := cmd.Output()
	if err != nil {
		return nil, nil
	}

	var data FFProbeData
	if err := json.Unmarshal(output, &data); err != nil {
		return nil, nil
	}

	if data.Format.Duration == "" {
		return nil, nil
	}

	duration, err := strconv.ParseFloat(data.Format.Duration, 64)
	if err != nil {
		return nil, nil
	}

	var fps *float64
	for _, stream := range data.Streams {
		if stream.CodecType == "video" {
			frameRate := stream.AvgFrameRate
			if frameRate == "" {
				frameRate = stream.RFrameRate
			}
			if frameRate != "" {
				fps = parseFraction(frameRate)
				break
			}
		}
	}

	return &duration, fps
}

type ProgramItem struct {
	In                 float64 `json:"in"`
	Out                float64 `json:"out"`
	Duration           float64 `json:"duration"`
	Source             string  `json:"source"`
	StartMinutePretty  string  `json:"start_minute_pretty"`
}

type Playlist struct {
	Channel string        `json:"channel"`
	Date    string        `json:"date"`
	Program []ProgramItem `json:"program"`
}

type CacheItem struct {
	SourcePath string
	Duration   float64
	FPS        float64
}

type SeriesBlock struct {
	FolderPath string
	Episodes   []CacheItem
	TotalDuration float64
}

type WeeklyDistributor struct {
	SeriesBlocks []SeriesBlock
	StandaloneFiles []CacheItem
	EpisodesPerDay int
}

type TimeSlot struct {
	StartHour int
	EndHour   int
	Content   []CacheItem
}

type DaySchedule struct {
	TimeSlots []TimeSlot
}

type GenerationSummary struct {
	TotalFiles        int
	TotalFolders      int
	UniqueFiles       int
	RepeatPercentage  float64
	UniquenessPercent float64
	UnusedFiles       int
	UnusedDuration    float64
	TotalDuration     float64
	UsedDuration      float64
}



func buildPlaylist(channel, dateStr string, inputs []string, resolveAbs bool, maxTotalSeconds *float64, preCache []CacheItem, startIndex int, ageRatingFile string) Playlist {
	var cache []CacheItem
	
	if preCache != nil {
		cache = preCache
	} else {
		for _, p := range inputs {
			duration, fps := runFFProbe(p)
			if duration == nil || *duration <= 0 {
				continue
			}
			
			sourcePath := p
			if resolveAbs {
				if absPath, err := filepath.Abs(p); err == nil {
					sourcePath = absPath
				}
			}
			// Map container path to host path if configured
			sourcePath = filepath.ToSlash(mapToHostPath(sourcePath))
			
			fpsVal := 25.0
			if fps != nil && *fps > 0 {
				fpsVal = *fps
			}
			
			cache = append(cache, CacheItem{
				SourcePath: sourcePath,
				Duration:   *duration,
				FPS:        fpsVal,
			})
		}
	}

	var programItems []ProgramItem
	accumulated := 0.0

	if len(cache) == 0 {
		return Playlist{Channel: channel, Date: dateStr, Program: programItems}
	}

	// Получаем информацию о файле возрастного рейтинга
	var ageRatingDuration float64
	var ageRatingPath string

	if ageRatingFile != "" {
		duration, _ := runFFProbe(ageRatingFile)
		if duration != nil && *duration > 0 {
			ageRatingDuration = *duration
			ageRatingPath = ageRatingFile
			if resolveAbs {
				if absPath, err := filepath.Abs(ageRatingFile); err == nil {
					ageRatingPath = absPath
				}
			}
			ageRatingPath = filepath.ToSlash(mapToHostPath(ageRatingPath))
		}
	}

	totalItems := len(cache)
	idx := startIndex % totalItems
	if idx < 0 {
		idx = 0
	}

	for {
		if maxTotalSeconds != nil && accumulated >= *maxTotalSeconds {
			break
		}

		item := cache[idx]

		// Проверяем, поместится ли возрастной рейтинг + контент
		totalDuration := item.Duration
		if ageRatingPath != "" {
			totalDuration += ageRatingDuration
		}

		if maxTotalSeconds != nil && (accumulated+totalDuration) > *maxTotalSeconds {
			break
		}

		// Вставляем возрастной рейтинг перед контентом
		if ageRatingPath != "" {
			programItems = append(programItems, ProgramItem{
				In:       accumulated,
				Out:      accumulated + ageRatingDuration,
				Duration: ageRatingDuration,
				Source:   ageRatingPath,
			})
			accumulated += ageRatingDuration
		}

		// Вставляем основной контент
		programItems = append(programItems, ProgramItem{
			In:       accumulated,
			Out:      accumulated + item.Duration,
			Duration: item.Duration,
			Source:   item.SourcePath,
		})

		accumulated += item.Duration
		idx = (idx + 1) % totalItems

		if totalItems == 1 && (item.Duration <= 0 || (maxTotalSeconds != nil && totalDuration > *maxTotalSeconds)) {
			break
		}
	}

	return Playlist{
		Channel: channel,
		Date:    dateStr,
		Program: programItems,
	}
}

func loadFilelist(filelistPath string) ([]string, error) {
	if filelistPath == "" {
		return []string{}, nil
	}
	
	content, err := os.ReadFile(filelistPath)
	if err != nil {
		return nil, err
	}
	
	var paths []string
	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		paths = append(paths, line)
	}
	
	return paths, nil
}

func deduplicatePreserveOrder(paths []string) []string {
	seen := make(map[string]bool)
	var result []string
	
	for _, p := range paths {
		if !seen[p] {
			seen[p] = true
			result = append(result, p)
		}
	}
	
	return result
}

// Группирует файлы по папкам для создания виртуальных блоков сериалов
func groupFilesByFolder(cache []CacheItem, episodesPerDay int) WeeklyDistributor {
	folderMap := make(map[string][]CacheItem)
	var standaloneFiles []CacheItem
	
	// Группируем файлы по папкам
	for _, item := range cache {
		dir := filepath.Dir(item.SourcePath)
		parentDir := filepath.Dir(dir)
		
		// Если файл в подпапке (не в корне), группируем по папке
		if dir != "." && parentDir != "." {
			folderMap[dir] = append(folderMap[dir], item)
		} else {
			standaloneFiles = append(standaloneFiles, item)
		}
	}
	
	var seriesBlocks []SeriesBlock
	
	// Создаем блоки для папок с несколькими файлами
	for folderPath, episodes := range folderMap {
		if len(episodes) > 1 {
			totalDuration := 0.0
			for _, ep := range episodes {
				totalDuration += ep.Duration
			}
			
			seriesBlocks = append(seriesBlocks, SeriesBlock{
				FolderPath: folderPath,
				Episodes: episodes,
				TotalDuration: totalDuration,
			})
		} else {
			// Одиночные файлы в папках тоже считаем standalone
			standaloneFiles = append(standaloneFiles, episodes[0])
		}
	}
	
	return WeeklyDistributor{
		SeriesBlocks: seriesBlocks,
		StandaloneFiles: standaloneFiles,
		EpisodesPerDay: episodesPerDay,
	}
}

// Создает распределение эпизодов сериалов на неделю
func (wd *WeeklyDistributor) distributeSeriesForWeek(dayIndex int) []CacheItem {
	var dayContent []CacheItem
	
	// Для каждого сериала берем определенное количество эпизодов для данного дня
	for _, series := range wd.SeriesBlocks {
		startEpisode := dayIndex * wd.EpisodesPerDay
		endEpisode := startEpisode + wd.EpisodesPerDay
		
		if startEpisode < len(series.Episodes) {
			if endEpisode > len(series.Episodes) {
				endEpisode = len(series.Episodes)
			}
			
			episodesForDay := series.Episodes[startEpisode:endEpisode]
			dayContent = append(dayContent, episodesForDay...)
		}
	}
	
	return dayContent
}

// Равномерно распределяет standalone файлы по дням недели
func distributeStandaloneFiles(files []CacheItem, dayIndex, totalDays int) []CacheItem {
	var dayFiles []CacheItem
	
	// Группируем файлы по длительности для более равномерного распределения
	durationGroups := make(map[int][]CacheItem) // ключ - округленная длительность в минутах
	
	for _, file := range files {
		durationKey := int(file.Duration / 60) // группируем по минутам
		durationGroups[durationKey] = append(durationGroups[durationKey], file)
	}
	
	// Для каждой группы длительности распределяем файлы равномерно
	// Используем смещение для лучшего распределения между группами
	groupOffset := 0
	for _, group := range durationGroups {
		for i, file := range group {
			// Добавляем смещение группы для избежания концентрации файлов одной длительности в одном дне
			distributionIndex := (i + groupOffset) % totalDays
			if distributionIndex == dayIndex {
				dayFiles = append(dayFiles, file)
			}
		}
		groupOffset = (groupOffset + 1) % totalDays // смещаем для следующей группы
	}
	
	return dayFiles
}

// Создает временные слоты для равномерного распределения папок по дню
func createTimeSlots() []TimeSlot {
	return []TimeSlot{
		{StartHour: 6, EndHour: 10, Content: []CacheItem{}},   // Утро
		{StartHour: 10, EndHour: 14, Content: []CacheItem{}},  // День
		{StartHour: 14, EndHour: 18, Content: []CacheItem{}},  // Вечер
		{StartHour: 18, EndHour: 22, Content: []CacheItem{}},  // Ночь
		{StartHour: 22, EndHour: 6, Content: []CacheItem{}},   // Поздняя ночь
	}
}

// Распределяет сериалы по временным слотам для лучшего перемешивания
func distributeSeriesByTimeSlots(seriesBlocks []SeriesBlock, dayIndex, episodesPerDay int) []TimeSlot {
	timeSlots := createTimeSlots()
	
	// Для каждого сериала определяем его временной слот
	for seriesIndex, series := range seriesBlocks {
		slotIndex := seriesIndex % len(timeSlots)
		
		// Берем эпизоды для данного дня
		startEpisode := dayIndex * episodesPerDay
		endEpisode := startEpisode + episodesPerDay
		
		if startEpisode < len(series.Episodes) {
			if endEpisode > len(series.Episodes) {
				endEpisode = len(series.Episodes)
			}
			
			episodesForDay := series.Episodes[startEpisode:endEpisode]
			timeSlots[slotIndex].Content = append(timeSlots[slotIndex].Content, episodesForDay...)
		}
	}
	
	return timeSlots
}

// Объединяет контент из временных слотов с перемешиванием
func mergeTimeSlotsWithMixing(timeSlots []TimeSlot, standaloneFiles []CacheItem) []CacheItem {
	var result []CacheItem
	
	// Определяем максимальное количество элементов в любом слоте
	maxItems := 0
	for _, slot := range timeSlots {
		if len(slot.Content) > maxItems {
			maxItems = len(slot.Content)
		}
	}
	
	// Добавляем standalone файлы в слоты равномерно
	for i, file := range standaloneFiles {
		slotIndex := i % len(timeSlots)
		timeSlots[slotIndex].Content = append(timeSlots[slotIndex].Content, file)
		if len(timeSlots[slotIndex].Content) > maxItems {
			maxItems = len(timeSlots[slotIndex].Content)
		}
	}
	
	// Перемешиваем контент: берем по одному элементу из каждого слота по очереди
	for itemIndex := 0; itemIndex < maxItems; itemIndex++ {
		for _, slot := range timeSlots {
			if itemIndex < len(slot.Content) {
				result = append(result, slot.Content[itemIndex])
			}
		}
	}
	
	return result
}

// Простое распределение без временных слотов
func createSimpleWeeklyDistribution(cache []CacheItem, episodesPerDay int) [][]CacheItem {
	distributor := groupFilesByFolder(cache, episodesPerDay)
	weeklyDistribution := make([][]CacheItem, 7) // 7 дней недели
	
	// Распределяем сериалы по дням
	for dayIndex := 0; dayIndex < 7; dayIndex++ {
		seriesContent := distributor.distributeSeriesForWeek(dayIndex)
		standaloneContent := distributeStandaloneFiles(distributor.StandaloneFiles, dayIndex, 7)
		
		// Объединяем контент дня
		dayContent := append(seriesContent, standaloneContent...)
		weeklyDistribution[dayIndex] = dayContent
	}
	
	// Балансируем общую длительность дней
	return balanceDailyDurations(weeklyDistribution)
}

// Улучшенная функция для создания более сбалансированного распределения
func createBalancedWeeklyDistribution(cache []CacheItem, episodesPerDay int, useTimeSlots bool) [][]CacheItem {
	if !useTimeSlots {
		return createSimpleWeeklyDistribution(cache, episodesPerDay)
	}
	
	distributor := groupFilesByFolder(cache, episodesPerDay)
	weeklyDistribution := make([][]CacheItem, 7) // 7 дней недели
	
	// Распределяем контент по дням с использованием временных слотов
	for dayIndex := 0; dayIndex < 7; dayIndex++ {
		// Распределяем сериалы по временным слотам
		timeSlots := distributeSeriesByTimeSlots(distributor.SeriesBlocks, dayIndex, episodesPerDay)
		
		// Получаем standalone файлы для данного дня
		standaloneContent := distributeStandaloneFiles(distributor.StandaloneFiles, dayIndex, 7)
		
		// Объединяем контент с перемешиванием
		dayContent := mergeTimeSlotsWithMixing(timeSlots, standaloneContent)
		weeklyDistribution[dayIndex] = dayContent
	}
	
	// Балансируем общую длительность дней
	return balanceDailyDurations(weeklyDistribution)
}

// Балансирует длительность контента между днями недели
func balanceDailyDurations(weeklyDistribution [][]CacheItem) [][]CacheItem {
	// Вычисляем общую длительность для каждого дня
	dailyDurations := make([]float64, 7)
	for dayIndex, dayContent := range weeklyDistribution {
		for _, item := range dayContent {
			dailyDurations[dayIndex] += item.Duration
		}
	}
	
	// Находим среднюю длительность
	totalDuration := 0.0
	for _, duration := range dailyDurations {
		totalDuration += duration
	}
	averageDuration := totalDuration / 7.0
	
	// Простая балансировка: перемещаем короткие файлы из "тяжелых" дней в "легкие"
	for attempt := 0; attempt < 3; attempt++ { // максимум 3 попытки балансировки
		maxDay, minDay := 0, 0
		for i := 1; i < 7; i++ {
			if dailyDurations[i] > dailyDurations[maxDay] {
				maxDay = i
			}
			if dailyDurations[i] < dailyDurations[minDay] {
				minDay = i
			}
		}
		
		// Если разница незначительная, прекращаем балансировку
		if dailyDurations[maxDay] - dailyDurations[minDay] < averageDuration * 0.2 {
			break
		}
		
		// Ищем подходящий файл для перемещения
		moved := false
		for i, item := range weeklyDistribution[maxDay] {
			targetDuration := dailyDurations[minDay] + item.Duration
			if targetDuration <= averageDuration * 1.1 { // не превышаем 110% от среднего
				// Перемещаем файл
				weeklyDistribution[minDay] = append(weeklyDistribution[minDay], item)
				weeklyDistribution[maxDay] = append(weeklyDistribution[maxDay][:i], weeklyDistribution[maxDay][i+1:]...)
				
				// Обновляем длительности
				dailyDurations[maxDay] -= item.Duration
				dailyDurations[minDay] += item.Duration
				moved = true
				break
			}
		}
		
		if !moved {
			break // не удалось найти подходящий файл для перемещения
		}
	}
	
	return weeklyDistribution
}

// Создает плейлист с поддержкой виртуальных блоков для недельного режима
func buildWeeklyPlaylist(channel, dateStr string, cache []CacheItem, resolveAbs bool, maxTotalSeconds *float64, startIndex int, dayIndex int, useSeries bool, episodesPerDay int, useTimeSlots bool, ageRatingFile string) Playlist {
	var dayCache []CacheItem
	
	if useSeries && len(cache) > 0 {
		// Используем улучшенный алгоритм для сбалансированного распределения
		weeklyDistribution := createBalancedWeeklyDistribution(cache, episodesPerDay, useTimeSlots)
		
		// Получаем контент для конкретного дня
		if dayIndex < len(weeklyDistribution) {
			dayCache = weeklyDistribution[dayIndex]
		}
	} else {
		// Обычный режим - просто используем весь кеш
		dayCache = cache
	}
	
	return buildPlaylist(channel, dateStr, nil, resolveAbs, maxTotalSeconds, dayCache, startIndex, ageRatingFile)
}

// Подсчитывает статистику генерации плейлистов
func calculateGenerationSummary(cache []CacheItem, results []Playlist, useSeries bool) GenerationSummary {
	summary := GenerationSummary{}
	
	// Подсчет общего количества файлов и их длительности
	summary.TotalFiles = len(cache)
	folderMap := make(map[string]bool)
	
	for _, item := range cache {
		summary.TotalDuration += item.Duration
		dir := filepath.Dir(item.SourcePath)
		if dir != "." {
			folderMap[dir] = true
		}
	}
	
	summary.TotalFolders = len(folderMap)
	
	// Подсчет использованных файлов
	usedFiles := make(map[string]int) // путь -> количество использований
	
	for _, playlist := range results {
		for _, program := range playlist.Program {
			usedFiles[program.Source]++
			summary.UsedDuration += program.Duration
		}
	}
	
	summary.UniqueFiles = len(usedFiles)
	summary.UnusedFiles = summary.TotalFiles - summary.UniqueFiles
	summary.UnusedDuration = summary.TotalDuration - summary.UsedDuration
	
	// Подсчет повторов
	totalUsages := 0
	for _, count := range usedFiles {
		totalUsages += count
	}
	
	if summary.UniqueFiles > 0 {
		summary.RepeatPercentage = float64(totalUsages-summary.UniqueFiles) / float64(totalUsages) * 100
		summary.UniquenessPercent = float64(summary.UniqueFiles) / float64(summary.TotalFiles) * 100
	}
	
	return summary
}

// Выводит сводку генерации
func printGenerationSummary(summary GenerationSummary, lang string) {
	fmt.Fprintln(os.Stderr, "")
	
	if lang == "ru" {
		fmt.Fprintln(os.Stderr, "=== 📊 Сводка генерации ===")
		fmt.Fprintf(os.Stderr, "📁 Всего файлов: %d\n", summary.TotalFiles)
		fmt.Fprintf(os.Stderr, "📂 Всего папок: %d\n", summary.TotalFolders)
		fmt.Fprintf(os.Stderr, "✨ Уникальных файлов использовано: %d\n", summary.UniqueFiles)
		fmt.Fprintf(os.Stderr, "🔄 Повторов: %.1f%%\n", summary.RepeatPercentage)
		fmt.Fprintf(os.Stderr, "💎 Уникальность: %.1f%%\n", summary.UniquenessPercent)
		fmt.Fprintf(os.Stderr, "📋 Неиспользованных файлов: %d\n", summary.UnusedFiles)
		fmt.Fprintf(os.Stderr, "⏱️  Общая длительность: %.1f часов\n", summary.TotalDuration/3600)
		fmt.Fprintf(os.Stderr, "✅ Использовано: %.1f часов\n", summary.UsedDuration/3600)
		fmt.Fprintf(os.Stderr, "❌ Не распределено: %.1f часов\n", summary.UnusedDuration/3600)
	} else {
		fmt.Fprintln(os.Stderr, "=== 📊 Генерация туралы есеп ===")
		fmt.Fprintf(os.Stderr, "📁 Барлық файлдар: %d\n", summary.TotalFiles)
		fmt.Fprintf(os.Stderr, "📂 Барлық қалталар: %d\n", summary.TotalFolders)
		fmt.Fprintf(os.Stderr, "✨ Бірегей файлдар пайдаланылды: %d\n", summary.UniqueFiles)
		fmt.Fprintf(os.Stderr, "🔄 Қайталаулар: %.1f%%\n", summary.RepeatPercentage)
		fmt.Fprintf(os.Stderr, "💎 Бірегейлік: %.1f%%\n", summary.UniquenessPercent)
		fmt.Fprintf(os.Stderr, "📋 Пайдаланылмаған файлдар: %d\n", summary.UnusedFiles)
		fmt.Fprintf(os.Stderr, "⏱️  Жалпы ұзақтық: %.1f сағат\n", summary.TotalDuration/3600)
		fmt.Fprintf(os.Stderr, "✅ Пайдаланылды: %.1f сағат\n", summary.UsedDuration/3600)
		fmt.Fprintf(os.Stderr, "❌ Бөлінбеген: %.1f сағат\n", summary.UnusedDuration/3600)
	}
	
	fmt.Fprintln(os.Stderr, "=======================================")
}

// Создает структуру папок YYYY/MM/ и возвращает полный путь к файлу
func createDateStructurePath(baseDir, dateStr string) (string, error) {
	// Парсим дату
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "", fmt.Errorf("ошибка парсинга даты %s: %v", dateStr, err)
	}
	
	// Создаем структуру папок YYYY/MM
	yearDir := date.Format("2006")
	monthDir := date.Format("01")
	
	targetDir := filepath.Join(baseDir, yearDir, monthDir)
	
	// Создаем папки если они не существуют
	err = os.MkdirAll(targetDir, 0755)
	if err != nil {
		return "", fmt.Errorf("ошибка создания папки %s: %v", targetDir, err)
	}
	
	// Возвращаем полный путь к файлу
	fileName := dateStr + ".json"
	return filepath.Join(targetDir, fileName), nil
}



func main() {
	// Определяем флаги
	var (
		channel     = flag.String("c", "Channel", "Имя канала")
		date        = flag.String("d", "", "Дата плейлиста в формате YYYY-MM-DD (по умолчанию: вещательный день)")
		directory   = flag.String("dir", "", "Каталог для сканирования")
		recursive   = flag.Bool("r", false, "Сканировать рекурсивно каталог")
		filelist    = flag.String("fl", "", "Файл-список путей к видео")
		output      = flag.String("o", "", "Путь для записи JSON (если не задано — stdout)")
		noAbs       = flag.Bool("no-abs", false, "Не преобразовывать пути в абсолютные")
		lang        = flag.String("lang", "ru", "Язык сообщений (ru/kk)")
		maxItems    = flag.Int("m", 0, "Ограничить количество элементов плейлиста")
		period      = flag.String("p", "today", "Период генерации: today (по умолчанию), day (по указанной дате), week (по ISO-номеру недели)")
		week        = flag.Int("w", 0, "ISO номер недели для режима week (1-53, 0=следующая неделя)")
		year        = flag.Int("y", 0, "Год для режима week (по умолчанию текущий)")
		prev        = flag.String("prev", "", "Папка или файл предыдущих плейлистов для продолжения без повторов")
		useSeries   = flag.Bool("series", false, "Включить режим виртуальных блоков для сериалов в папках")
		episodesPerDay = flag.Int("episodes", 4, "Количество эпизодов сериала на день (по умолчанию: 4)")
		useTimeSlots = flag.Bool("timeslots", true, "Использовать временные слоты для перемешивания папок (по умолчанию: включено)")
		apiMode     = flag.Bool("api", false, "Запустить в режиме API сервера")
		apiPort     = flag.String("port", "8080", "Порт для API сервера (по умолчанию: 8080)")
		mapFrom     = flag.String("map-from", "", "Префикс пути внутри контейнера (например, /data)")
		mapTo       = flag.String("map-to", "", "Префикс пути на оригинальном сервере (например, /mnt/media)")
		ageRatingFile = flag.String("age-rating", "", "Путь к файлу возрастного рейтинга, который будет показан перед каждым контентом")
	)
	
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Использование: %s [ОПЦИИ] [файлы...]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "\nГенератор JSON-плейлиста по списку/каталогу видеофайлов\n\n")
		fmt.Fprintf(os.Stderr, "Позиционные аргументы:\n")
		fmt.Fprintf(os.Stderr, "  файлы...    Явные пути к файлам (дополняют --dir/--filelist)\n\n")
		fmt.Fprintf(os.Stderr, "Режимы работы:\n")
		fmt.Fprintf(os.Stderr, "  --api        Запустить в режиме API сервера с веб-интерфейсом\n")
		fmt.Fprintf(os.Stderr, "  --port       Порт для API сервера (по умолчанию: 8080)\n\n")
		fmt.Fprintf(os.Stderr, "Новые возможности:\n")
		fmt.Fprintf(os.Stderr, "  --series     Включает режим виртуальных блоков для сериалов в папках\n")
		fmt.Fprintf(os.Stderr, "  --episodes   Количество эпизодов сериала на день (работает с --series)\n")
		fmt.Fprintf(os.Stderr, "  --timeslots  Использовать временные слоты для перемешивания папок\n")
		fmt.Fprintf(os.Stderr, "               При недельном планировании (--p week --series):\n")
		fmt.Fprintf(os.Stderr, "               - Папки с сериалами разбиваются на блоки по дням\n")
		fmt.Fprintf(os.Stderr, "               - Каждая папка размещается в своем временном слоте\n")
		fmt.Fprintf(os.Stderr, "               - Контент из разных папок перемешивается по времени\n")
		fmt.Fprintf(os.Stderr, "               - Standalone файлы равномерно распределяются\n")
		fmt.Fprintf(os.Stderr, "               - Автоматическая балансировка длительности дней\n\n")
		fmt.Fprintf(os.Stderr, "Структура файлов:\n")
		fmt.Fprintf(os.Stderr, "  При указании папки вывода создается структура: YYYY/MM/YYYY-MM-DD.json\n")
		fmt.Fprintf(os.Stderr, "  Например: output/2024/01/2024-01-15.json\n\n")
		fmt.Fprintf(os.Stderr, "API режим:\n")
		fmt.Fprintf(os.Stderr, "  В API режиме доступен веб-интерфейс по адресу http://localhost:port/\n")
		fmt.Fprintf(os.Stderr, "  API эндпоинты: /api/status, /api/generate, /api/config, /api/logs\n\n")
		fmt.Fprintf(os.Stderr, "Опции:\n")
		flag.PrintDefaults()
	}
	
	flag.Parse()

	// Configure prefix mapping from container to host paths
	pathPrefixFrom = strings.TrimRight(*mapFrom, "/")
	pathPrefixTo = strings.TrimRight(*mapTo, "/")

	// Проверяем API режим
	if *apiMode {
		fmt.Fprintf(os.Stderr, "🚀 API режим перенесен в отдельную программу!\n")
		fmt.Fprintf(os.Stderr, "📱 Используйте: go run ttb-gen-api.go -port %s\n", *apiPort)
		fmt.Fprintf(os.Stderr, "📡 Или скомпилируйте: go build -o ttb-gen-api ttb-gen-api.go && ./ttb-gen-api -port %s\n", *apiPort)
		os.Exit(1)
	}

	texts := MESSAGES[*lang]

	if !commandExists("ffprobe") {
		fmt.Fprintln(os.Stderr, texts["ffprobe_missing"])
		os.Exit(1)
	}

	var allInputs []string

	// Из каталога
	if *directory != "" {
		files, err := iterVideoFiles(*directory, *recursive)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Ошибка сканирования каталога: %v\n", err)
			os.Exit(1)
		}
		allInputs = append(allInputs, files...)
	}

	// Из списка файлов
	if *filelist != "" {
		files, err := loadFilelist(*filelist)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Ошибка чтения списка файлов: %v\n", err)
			os.Exit(1)
		}
		allInputs = append(allInputs, files...)
	}

	// Из позиционных аргументов
	for _, f := range flag.Args() {
		if _, err := os.Stat(f); err == nil && isVideoFile(f) {
			allInputs = append(allInputs, f)
		}
	}

	// Дедупликация и ограничение
	allInputs = deduplicatePreserveOrder(allInputs)
	if *maxItems > 0 && len(allInputs) > *maxItems {
		allInputs = allInputs[:*maxItems]
	}

	// Определяем целевые даты
	var dateStrings []string
	now := time.Now()
	
	switch *period {
	case "day":
		if *date == "" {
			broadcastDay := now
			if now.Hour() < 6 {
				broadcastDay = now.AddDate(0, 0, -1)
			}
			dateStrings = []string{broadcastDay.Format("2006-01-02")}
		} else {
			dateStrings = []string{*date}
		}
	case "week":
		yearVal := *year
		if yearVal == 0 {
			yearVal = now.Year()
		}
		weekVal := *week
		if weekVal == 0 {
			// По умолчанию используем следующую ISO-неделю от текущей даты
			next := now.AddDate(0, 0, 7)
			isoYearNext, isoWeekNext := next.ISOWeek()
			weekVal = isoWeekNext
			// Если год не задан явно, подставляем ISO-год следующей недели
			if *year == 0 {
				yearVal = isoYearNext
			}
		}
		
		// Находим понедельник указанной недели
		jan1 := time.Date(yearVal, 1, 1, 0, 0, 0, 0, time.UTC)
		_, jan1Week := jan1.ISOWeek()
		
		var startDay time.Time
		if jan1Week == 1 {
			// 1 января - в первой неделе
			daysToMonday := int(time.Monday - jan1.Weekday())
			if daysToMonday > 0 {
				daysToMonday -= 7
			}
			startDay = jan1.AddDate(0, 0, daysToMonday+(weekVal-1)*7)
		} else {
			// 1 января - в последней неделе предыдущего года
			daysToNextMonday := 7 - int(jan1.Weekday()) + 1
			firstMonday := jan1.AddDate(0, 0, daysToNextMonday)
			startDay = firstMonday.AddDate(0, 0, (weekVal-1)*7)
		}
		
		for i := 0; i < 7; i++ {
			day := startDay.AddDate(0, 0, i)
			dateStrings = append(dateStrings, day.Format("2006-01-02"))
		}
	default: // "today"
		broadcastDay := now
		if now.Hour() < 6 {
			broadcastDay = now.AddDate(0, 0, -1)
		}
		dateStrings = []string{broadcastDay.Format("2006-01-02")}
	}

	// Окно вещания: 06:00 - 05:59 следующего дня (23ч 59м = 86340с)
	broadcastWindowSeconds := float64(24*60*60 - 60)

	fmt.Fprintln(os.Stderr, texts["collecting"])

	// Создаем кеш для всех файлов сразу
	var cache []CacheItem
	for _, p := range allInputs {
		duration, fps := runFFProbe(p)
		if duration == nil || *duration <= 0 {
			continue
		}
		
		sourcePath := p
		if !*noAbs {
			if absPath, err := filepath.Abs(p); err == nil {
				sourcePath = absPath
			}
		}
		// Map container path to host path if configured
		sourcePath = filepath.ToSlash(mapToHostPath(sourcePath))
		
		fpsVal := 25.0
		if fps != nil && *fps > 0 {
			fpsVal = *fps
		}
		
		cache = append(cache, CacheItem{
			SourcePath: sourcePath,
			Duration:   *duration,
			FPS:        fpsVal,
		})
	}

	// Обработка предыдущих плейлистов
	startIndex := 0
	if *prev != "" {
		// Упрощенная реализация - пропускаем сложную логику парсинга предыдущих плейлистов
		// В реальной реализации здесь должна быть логика определения startIndex
	}

	var results []Playlist
	for i, dateStr := range dateStrings {
		// Базовое время для человеко-понятного старта: 06:00 локального времени
		baseDay, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Ошибка парсинга даты: %v\n", err)
			os.Exit(1)
		}
		baseStartDT := baseDay.Add(6 * time.Hour)

		var playlist Playlist
		
		// Используем новый режим для недельного планирования с сериалами
		if *period == "week" && *useSeries {
			playlist = buildWeeklyPlaylist(
				*channel,
				dateStr,
				cache,
				!*noAbs,
				&broadcastWindowSeconds,
				startIndex,
				i, // день недели (0-6)
				*useSeries,
				*episodesPerDay,
				*useTimeSlots,
				*ageRatingFile,
			)
		} else {
			// Стандартный режим
			playlist = buildPlaylist(
				*channel,
				dateStr,
				nil, // передаем nil для inputs, так как используем preCache
				!*noAbs,
				&broadcastWindowSeconds,
				cache, // используем готовый кеш
				startIndex,
				*ageRatingFile,
			)
		}

		// Добавляем человеко-понятное время старта
		for i := range playlist.Program {
			startDT := baseStartDT.Add(time.Duration(playlist.Program[i].In) * time.Second)
			minute := (startDT.Minute() / 5) * 5
			prettyDT := time.Date(startDT.Year(), startDT.Month(), startDT.Day(), startDT.Hour(), minute, 0, 0, startDT.Location())
			playlist.Program[i].StartMinutePretty = prettyDT.Format("2006-01-02 15:04")
		}
		
		results = append(results, playlist)
	}

	// Вывод результата
	fmt.Fprintln(os.Stderr, texts["writing"])
	
	// Подсчитываем и выводим сводку
	summary := calculateGenerationSummary(cache, results, *useSeries)
	
	if len(results) == 1 {
		// Один плейлист
		var outPath string
		if *output != "" {
			stat, err := os.Stat(*output)
			if err == nil && stat.IsDir() {
				// Если указана папка, создаем структуру YYYY/MM/
				outPath, err = createDateStructurePath(*output, results[0].Date)
				if err != nil {
					fmt.Fprintf(os.Stderr, "Ошибка создания структуры папок: %v\n", err)
					os.Exit(1)
				}
			} else {
				// Если указан конкретный файл, используем его
				outPath = *output
			}
		}
		
		outputJSON, err := json.MarshalIndent(results[0], "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Ошибка сериализации JSON: %v\n", err)
			os.Exit(1)
		}
		
		if outPath != "" {
			err = os.WriteFile(outPath, outputJSON, 0644)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Ошибка записи файла: %v\n", err)
				os.Exit(1)
			}
			fmt.Fprintf(os.Stderr, "Плейлист сохранен: %s\n", outPath)
		}
		
		fmt.Println(string(outputJSON))
	} else {
		// Несколько плейлистов
		var baseDir string
		if *output != "" {
			stat, err := os.Stat(*output)
			if err == nil && stat.IsDir() {
				baseDir = *output
			} else {
				baseDir = filepath.Dir(*output)
			}
		} else {
			baseDir = "."
		}
		
		for _, pl := range results {
			// Создаем структуру папок YYYY/MM/ для каждого плейлиста
			outPath, err := createDateStructurePath(baseDir, pl.Date)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Ошибка создания структуры папок для %s: %v\n", pl.Date, err)
				os.Exit(1)
			}
			
			outputJSON, err := json.MarshalIndent(pl, "", "  ")
			if err != nil {
				fmt.Fprintf(os.Stderr, "Ошибка сериализации JSON: %v\n", err)
				os.Exit(1)
			}
			
			err = os.WriteFile(outPath, outputJSON, 0644)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Ошибка записи файла: %v\n", err)
				os.Exit(1)
			}
			
			fmt.Fprintf(os.Stderr, "Плейлист сохранен: %s\n", outPath)
			fmt.Println(string(outputJSON))
		}
	}
	
	// Выводим сводку генерации
	printGenerationSummary(summary, *lang)
}
