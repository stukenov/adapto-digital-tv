package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ChatGPT API структуры
type ChatGPTRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatGPTResponse struct {
	Choices []Choice `json:"choices"`
	Error   *APIError `json:"error,omitempty"`
}

type Choice struct {
	Message Message `json:"message"`
}

type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

// Конфигурация
type Config struct {
	APIKey      string
	Model       string
	MaxTokens   int
	Temperature float64
	BaseURL     string
}

// Опции обработки
type ProcessOptions struct {
	Input          string   // входной файл или папка
	Recursive      bool     // рекурсивный поиск
	JSONField      string   // поле JSON для извлечения
	Output         string   // файл вывода
	OutputJSON     bool     // вывод в формате JSON
	PreserveJSON   bool     // сохранить оригинальную JSON структуру
	NewJSONField   string   // новое поле для записи результата
	PromptTemplate string   // шаблон промта
	FileExtensions []string // расширения файлов для обработки
	InPlace        bool     // перезаписать оригинальные файлы
	Language       string   // язык для обработки текста
	IndividualMode bool     // обрабатывать каждую строку отдельно
	MaxRetries     int      // максимальное количество попыток
	RetryDelay     int      // задержка между попытками в секундах
	BaseDelay      int      // базовая задержка перед каждым запросом в секундах
	SkipExisting   bool     // пропускать строки с уже заполненными полями
}

// Шаблоны промтов
var PromptTemplates = map[string]string{
	"summarize": "Create a brief summary of the following text in %s:\n\n%s",
	"translate": "Translate the following text to %s:\n\n%s",
	"humanize":  "Make the following text more human-friendly and readable in %s:\n\n%s",
	"analyze":   "Analyze the following text and provide a brief analysis in %s:\n\n%s",
	"extract":   "Extract key information from the following text in %s:\n\n%s",
	"correct":   "Fix errors and improve the style of the following text in %s:\n\n%s",
	"program_name": "Extract the program title from this file path and return it in %s language. " +
		"Return ONLY the clean title without numbers, technical data, or file extensions.\n\n" +
		"Examples:\n" +
		"- /srv/ffplayout-media/10/saryarqa_theatr/-armanym-aselim--_sh-aytmatov_-2021-.mkv → Арманым Әселім - Ш. Айтматов\n" +
		"- /srv/ffplayout-media/10/ontystik_opera/opera_qyz_zhibek__1sag_29m__02cc-5779.mkv → Қыз Жібек Операсы\n" +
		"- /srv/ffplayout-media/10/atyrau_spektakl/mukagali_men_fariza_spektakl-5675.mkv → Мұқағали мен Фариза\n" +
		"- /srv/ffplayout-media/10/qostanai_spektakl/akbas_burkit-spektakl__hr_1_22_41-5765.mkv → Ақбас Бұркіт\n" +
		"- /srv/ffplayout-media/10/semei_spektakl/bir_tup_alma_agashy_spektakl_16-08-2.mkv → Бір түп алма ағашы\n" +
		"- /srv/ffplayout-media/10/saryarqa_theatr/-ay_karangysy--_a-aktay_-2024-.mkv → Ай Қарангысы - А. Ақтай\n" +
		"- /srv/ffplayout-media/10/qyzyljar_spektakl/20_07_24_spektakl_zh-suleymenov-5698.mkv → Ж. Сүлейменов спектаклі\n" +
		"- /srv/ffplayout-media/10/-unsizdiktin_uni-_andrea_bochelli_men_muslim_magomaevtyn_uzdik_anderi___07-01-2024____tolyk_shet_tili-5733.mkv → Үнсіздіктің үні - Андреа Бочелли мен Мұслим Мағомаевтың үздік әндері\n" +
		"- /srv/ffplayout-media/1/apke/Apke_14_bolim_ispr_.mp4 → Әпке - 14 бөлім\n" +
		"- /srv/ffplayout-media/1/Zhedel zhardem/Zhedel zhardem 01_bolim.mp4 → Жедел жәрдем - 1 бөлім\n" +
		"- /srv/ffplayout-media/1/Tugan_eldin_tutinI/Tugan_eldin_tutini-03.mp4 → Туған елдің түтіні - 3 бөлім\n" +
		"- /srv/ffplayout-media/2/an_salady_mamandar/an_salady_mamandar_durys_1_habar-2462.mkv → Ән салады мамандар - 1 хабар\n" +
		"- /srv/ffplayout-media/1/kui_gumyr/kui-gumyr-01-new-mxf-5089.mkv → Күй ғұмыр - 1 бөлім\n" +
		"- /srv/ffplayout-media/1/altyn_uya/altyn_uya-11-5075.mkv → Алтын ұя - 11 бөлім\n" +
		"- /srv/ffplayout-media/2/Tungi_studio_Nurlan_Koianbaev/01.04.15_Tungi_studya_Abu_Nasr_Serikov.mp4 → Түнгі студияда Нұрлан Қоянбаев - Әбу-Насыр Сериков\n" +
		"- /srv/ffplayout-media/2/MUZART LIVE Mega zhoba/06.11.16_MUZART_LIVE_EP_06_MASTER_ispr.mp4 → МузАРТ LIVE - 6 бағдарлама\n" +
		"- /srv/ffplayout-media/2/ULTTYQ SHOU ROZA SHAQYRADY/02.08.15_ULTTYK_SHOU_12_songy_bagdarlama.mp4 → Ұлттық шоу - Роза шақырады - 12 бағдарлама\n" +
		"- /srv/ffplayout-media/3/ertis_estrada/АЛМАТЫ ӘУЕНДЕРІ концерт 1ч 33мин.mp4 → Алматы әуендері концерті\n" +
		"- /srv/ffplayout-media/3/semei_estrada/2_chast_kala_kuni_28-09-24.mkv → Қала күні - 2-бөлім\n" +
		"- /srv/ffplayout-media/4/erkeler/erkeler_11_seriya-2758.mkv → Еркелер - 11 бөлім\n" +
		"- /srv/ffplayout-media/4/MULT_Z2-2/Karaoke 2024/2021/10 Караоке-Ardakty ake.mp4 → Караоке - Ардақты әке\n" +
		"- /srv/ffplayout-media/5/Biregei/biken_rimova_dayyn_29-10-2022_norma-4352.mkv → Бірегей - Бикен Римова\n" +
		"- /srv/ffplayout-media/1/inkar_jurek_3_mausym/inkar_jurek-3m_15-5333.mkv → Іңкәр жүрек - 3  маусым, 15 бөлім\n" +
		"- /srv/ffplayout-media/1/muzdagy__jalyn/muzdagy-jalyn-02-mxf-5631.mkv → Мұздағы жалын - 2 бөлім\n" +
		"- /srv/ffplayout-media/5/Gimarat/Gimarat_kyzyltan_matalar_yi_-3610.mkv → Ғимарат - Қызылтан маталар үйі\n" +
		"- /srv/ffplayout-media/5/Tulga/12_tulga_zhumabek_kenzhalin_12-09-24-4425.mkv → Тұлға - Жұмабек Кенжалин\n" +
		"- /srv/ffplayout-media/5/Kudiretti_kilkalam_2021-2022/qq_10_syrgabaev_30-05-2022-4297.mkv → Құдіретті қылқалам - Сырғабаев\n" +
		"- /srv/ffplayout-media/5/Zamana bulbuldary/Zamana bulbuldary Kenen df ispr.mp4 → Замана бұлбұлдары - Кенен\n" +
		"- /srv/ffplayout-media/5/Imena/10_imena_film_potanin_ispr_06-06-2022___-4033.mkv → Имена - Потанин\n" +
		"- /srv/ffplayout-media/2/MUZART LIVE Mega zhoba/02.10.16_MUZART_LIVE_EP_01_ISPR_NEW.mp4 → МузАРТ LIVE мегажобасы\n" +
		"- /srv/ffplayout-media/2/KESH ZHARYQ/2012 zh. Kesh zharyq Dasturly anmen estrada 1 tur IMX 14028  (kod).mp4 → Кеш жарық - Дәстүрлі әнмен эстрада - 1 тур\n" +
		"- /srv/ffplayout-media/2/ULTTYQ SHOU Ishki onim/01.06.14 Ulttyq shoq Balalarga bazarlyq.mp4 → Ұлттық шоу - балаларға базарлық\n" +
		"- /srv/ffplayout-media/3/Shygarmashylyk_kesh/03-03-2018_eki_zhurek_arailym_rahym_shygarmashylyq_keshi.mp4 → Екі жүрек - Арайлым Рахым - шығармашылық кеші\n" +
		"- /srv/ffplayout-media/4/MULT_Z2-2/Karaoke 2024/2016/1 - AK JAUYN.mp4 → Караоке - Ақ жауын\n" +
		"- /srv/ffplayout-media/4/MULT_Z2-2/Karaoke 2024/2016/10 -  Ai didarly anashim.mp4 → Караоке - Ай дидарлы анашым\n" +
		"- /srv/ffplayout-media/4/alan_men_kozykan/alan_men_kozyka_2_ser-2617.mkv → Алан мен Қозықан - 2 бөлім\n" +
		"- /srv/ffplayout-media/4/baldyrgan_2012/baldyrgan_1_ser_irim-tiim_2012-2726.mkv → Балдырған - 1 серия - Ырым - тыйым\n" +
		"- /srv/ffplayout-media/4/ol_rim-_bui_ne_2012/ol_kim_bul_ne_12_muhit_burwak_muz_new-2780.mkv → Ол кім, бұл не - Мұхит Бұршақ\n" +
		"- /srv/ffplayout-media/4/baldyrgan_2012/baldyrgan_2_ser_adasu_new-2721.mkv → Балдырған - 2 бөлім\n" +
		"- /srv/ffplayout-media/4/3_dostin_erlegi/3dostin_erlegi_2_kultegin-2645.mkv → Үш достың ерлігі - 2 бөлім - Күлтегін\n" +
		"- /srv/ffplayout-media/1/kozy_korpesh_bayan_sulu/qozy-korpes-baian-suly-5-mxf-5144.mkv → Қозы Көрпеш - Баян Сұлу\n" +
		"- /srv/ffplayout-media/5/Malim_de_beimalim_kz_2014/27.07.15 MALIM  DE BEIMALIM QAZAQSTAN_Qaton-Qaragai samyrsynnyn suyly.mp4 → Мәлім де беймәлім Қазақстан - Қатон-Қарағай самырсының сулығы\n" +
		"- /srv/ffplayout-media/5/Kudiretti_kilkalam_2024/qq_4_tolkyn_01-04-2024-3334.mkv → Құдіретті қылқалам -  Толқын\n" +
		"- /srv/ffplayout-media/5/Kily_zaman/kily_zaman_16_seria_kazak_handygy_norma__02-15__2021_zhyl_beru_-4314.mkv → Килі заман - 16 бөлім\n" +
		"- /srv/ffplayout-media/5/Turki_alemy/turki_alemi_etik_30min_21sek_new_06-10-2021___04_19_14_36_16_35-_2021_zhyl_beru-4004.mkv → Түркі әлемі - Етік\n" +
		"- /srv/ffplayout-media/5/Tauelsizdik_tarlandary/tauelsizdik_tarlandary_kuanysh_sultanov_final_27-08-2021-3453.mkv → Тәуелсіздік тарландары - Қуаныш Сұлтанов\n" +	
		"- /srv/ffplayout-media/6/Gasyrlar_pernesi/4_gasirlar_pernesy__muhit-_garifolla__04-09-2021-30.mkv → Ғасырлар пернесі - Мұхит Ғарифолла\n" +
		"- /srv/ffplayout-media/2/zharqyn_zhuzdesu_2023-2024/13-07-2024_zharqyn_zhuzdesu_koba_auka_ispr_1-2399.mkv → Жарқын жүздесу - Коба, Аука\n" +
		"- /srv/ffplayout-media/4/MULT_Z2-2/Karaoke 2024/2016/2 - keKdi mine jana jil.mp4 → Караоке - Келді міне жаңа жыл\n" +
		"- /srv/ffplayout-media/4/ol_rim-_bui_ne_2012/ol_kim_bul_ne_3_ozen_orman_korwagan_orta-2774.mkv → Ол кім, бұл не - 3 бөлім - өзен, орман, қоршаған орта\n" +
		"- /srv/ffplayout-media/4/ol_rim-_bui_ne_2012/ol_kim_bul_ne_1ser_kustar_kaskyr_aiu-2772.mkv → Ол кім, бұл не - 1 бөлім - Құстар, Қасқыр, Аю\n" +
		"- /srv/ffplayout-media/4/ol_rim-_bui_ne_2012/ol_kim_bul_ne_4_mysyktar_nege_juynady_kozi_janu_kolga-2766.mkv → Ол кім? Бұл не? - Мысықтар неге жуынады?\n" +
		"- /srv/ffplayout-media/8/Aitys_chempionat/Aitys chempionat 07.01.07  Salauat IUsaqaev -Saltanat Otelbaeva_El basqaru - erge syn IMX 3924.mp4 → Айтыс чемпионаты - Салауат Исақаев, Салтанат Өтелбаева - Ел басқару ерге сын\n" +
		"- /srv/ffplayout-media/8/Aitys2013-2016/13.09.14_NUR_OTAN_Aitys_JYRYN_BOLYP_TOGILEMIN_ELIM_1_BOLIM_21_12_13 kyskartylgan_07.06.14.mp4 → Нұр Отан айтысы - Жырың болып төгілемін елім - 1 бөлім\n" +
		"- /srv/ffplayout-media/10/08_syrly_sahna_ispr_05_05_21__tokpanov__16-5730.mkv → Сырлы сахна - Тоқпанов\n" +
		"- /srv/ffplayout-media/1/suie_bilsen/suie-bilsen-17-mp4-4719.mkv → Сүйе білсең - 17 бөлім\n" +
		"- /srv/ffplayout-media/4/balapan_jane_onyn_dostary/balapan_zhane_onin_dostary_s34_skorogovrki_2013-2792.mkv → Балапан және оның достары\n" +
		"- /srv/ffplayout-media/4/MULT_Z2-2/Karaoke 2024/2016/7 - Sagindim Azhe.mp4 → Караоке - Сағындым әже\n" +
		"- /srv/ffplayout-media/5/atyrau_derekti/tau_tulga_taumysh_2018_zh-3737.mkv → Тау тұлға тағмыш\n" +


		"File path: %s",
}

// Поддерживаемые языки
var SupportedLanguages = map[string]string{
	"ru":      "Russian",
	"kk":      "Kazakh",
	"en":      "English",
	"fr":      "French",
	"de":      "German",
	"es":      "Spanish",
	"it":      "Italian",
	"zh":      "Chinese",
	"ja":      "Japanese",
	"ko":      "Korean",
	"ar":      "Arabic",
	"pt":      "Portuguese",
	"nl":      "Dutch",
	"pl":      "Polish",
	"tr":      "Turkish",
	"uk":      "Ukrainian",
}

// Создание HTTP клиента с таймаутом
func createHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 30 * time.Second,
	}
}

// Отправка запроса к ChatGPT API
func callChatGPT(config Config, prompt string, baseDelay int) (string, error) {
	// Задержка перед каждым запросом для избежания rate limiting
	if baseDelay > 0 {
		time.Sleep(time.Duration(baseDelay) * time.Second)
	}
	request := ChatGPTRequest{
		Model: config.Model,
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens:   config.MaxTokens,
		Temperature: config.Temperature,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("ошибка маршалинга JSON: %v", err)
	}

	client := createHTTPClient()
	req, err := http.NewRequest("POST", config.BaseURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("ошибка создания запроса: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.APIKey)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("ошибка выполнения запроса: %v", err)
	}
	defer resp.Body.Close()
	
	// Проверяем HTTP статус код
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("HTTP ошибка %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ошибка чтения ответа: %v", err)
	}

	var response ChatGPTResponse
	if err := json.Unmarshal(body, &response); err != nil {
		// Логируем тело ответа для отладки
		fmt.Fprintf(os.Stderr, "Ошибка парсинга JSON. Тело ответа: %s\n", string(body))
		return "", fmt.Errorf("ошибка парсинга ответа: %v", err)
	}

	if response.Error != nil {
		return "", fmt.Errorf("API ошибка: %s", response.Error.Message)
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("пустой ответ от API")
	}

	return response.Choices[0].Message.Content, nil
}

// Проверка расширения файла
func hasValidExtension(filename string, extensions []string) bool {
	if len(extensions) == 0 {
		return true // если расширения не указаны, обрабатываем все файлы
	}
	
	ext := strings.ToLower(filepath.Ext(filename))
	for _, validExt := range extensions {
		if ext == validExt {
			return true
		}
	}
	return false
}

// Поиск файлов для обработки
func findFiles(input string, recursive bool, extensions []string) ([]string, error) {
	var files []string
	
	info, err := os.Stat(input)
	if err != nil {
		return nil, fmt.Errorf("ошибка доступа к %s: %v", input, err)
	}
	
	if !info.IsDir() {
		// Если это файл, просто добавляем его
		if hasValidExtension(input, extensions) {
			files = append(files, input)
		}
		return files, nil
	}
	
	// Если это папка
	if recursive {
		err = filepath.Walk(input, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && hasValidExtension(path, extensions) {
				files = append(files, path)
			}
			return nil
		})
	} else {
		entries, err := os.ReadDir(input)
		if err != nil {
			return nil, err
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				path := filepath.Join(input, entry.Name())
				if hasValidExtension(path, extensions) {
					files = append(files, path)
				}
			}
		}
	}
	
	return files, err
}

// Чтение содержимого файла
func readFileContent(filename string) (string, error) {
	content, err := os.ReadFile(filename)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// Проверка существования и заполненности поля в JSON
func checkJSONFieldExists(content, field string) (bool, error) {
	var data interface{}
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return false, fmt.Errorf("ошибка парсинга JSON: %v", err)
	}
	
	// Разбиваем путь по точкам
	fieldParts := strings.Split(field, ".")
	current := data
	
	for i, part := range fieldParts {
		switch v := current.(type) {
		case map[string]interface{}:
			if value, exists := v[part]; exists {
				current = value
			} else {
				return false, nil // поле не найдено
			}
		case []interface{}:
			// Для массива проверяем, что хотя бы в одном элементе поле заполнено
			for _, item := range v {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if value, exists := itemMap[part]; exists {
						// Проверяем, что значение не пустое
						switch val := value.(type) {
						case string:
							if strings.TrimSpace(val) != "" {
								return true, nil // найдено непустое значение
							}
						case nil:
							// null значение считается пустым
						default:
							// не-nil и не пустая строка считается заполненным
							return true, nil
						}
					}
				}
			}
			return false, nil // все элементы массива пустые или поле отсутствует
		default:
			return false, fmt.Errorf("невозможно проверить поле '%s' в типе %T на уровне %d", part, current, i+1)
		}
	}
	
	// Проверяем финальное значение
	switch v := current.(type) {
	case string:
		return strings.TrimSpace(v) != "", nil
	case nil:
		return false, nil
	default:
		return true, nil // не-nil значение считается заполненным
	}
}

// Извлечение поля из JSON с поддержкой вложенных полей (например, program.source)
func extractJSONField(content, field string) (string, error) {
	var data interface{}
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return "", fmt.Errorf("ошибка парсинга JSON: %v", err)
	}
	
	// Разбиваем путь по точкам
	fieldParts := strings.Split(field, ".")
	current := data
	
	for i, part := range fieldParts {
		switch v := current.(type) {
		case map[string]interface{}:
			if value, exists := v[part]; exists {
				current = value
			} else {
				return "", fmt.Errorf("поле '%s' не найдено в JSON на уровне %d", part, i+1)
			}
		case []interface{}:
			// Если это массив, извлекаем поле из каждого элемента
			var results []string
			for _, item := range v {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if value, exists := itemMap[part]; exists {
						switch val := value.(type) {
						case string:
							results = append(results, val)
						default:
							jsonValue, _ := json.Marshal(val)
							results = append(results, string(jsonValue))
						}
					}
				}
			}
			if len(results) > 0 {
				// Если нужно обработать каждый элемент массива отдельно,
				// возвращаем их как строки, разделенные переносами
				return strings.Join(results, "\n"), nil
			}
			return "", fmt.Errorf("поле '%s' не найдено в элементах массива", part)
		default:
			return "", fmt.Errorf("невозможно извлечь поле '%s' из типа %T", part, current)
		}
	}
	
	// Конвертируем финальное значение в строку
	switch v := current.(type) {
	case string:
		return v, nil
	default:
		jsonValue, err := json.Marshal(v)
		if err != nil {
			return "", fmt.Errorf("ошибка конвертации значения поля в строку: %v", err)
		}
		return string(jsonValue), nil
	}
}

// Получение полного названия языка
func getLanguageName(langCode string) string {
	if fullName, exists := SupportedLanguages[langCode]; exists {
		return fullName
	}
	// Если код языка не найден, возвращаем как есть
	return langCode
}

// Создание промта из шаблона
func createPrompt(template, content, language string) string {
	languageName := getLanguageName(language)
	
	if promptTemplate, exists := PromptTemplates[template]; exists {
		return fmt.Sprintf(promptTemplate, languageName, content)
	}
	// Если шаблон не найден, используем его как есть с подстановкой языка
	return fmt.Sprintf(template, languageName, content)
}

// Установка значения в JSON с поддержкой вложенных полей
func setJSONField(data interface{}, field, value string, skipExisting bool) error {
	fieldParts := strings.Split(field, ".")
	
	// Если поле не вложенное, устанавливаем на верхнем уровне
	if len(fieldParts) == 1 {
		if dataMap, ok := data.(map[string]interface{}); ok {
			if skipExisting {
				if _, exists := dataMap[field]; exists {
					return nil // Skip if field exists
				}
			}
			dataMap[field] = value
			return nil
		}
		return fmt.Errorf("невозможно установить поле '%s' в данном типе данных", field)
	}
	
	// Для вложенных полей находим путь к массиву
	current := data
	for i, part := range fieldParts[:len(fieldParts)-1] {
		switch v := current.(type) {
		case map[string]interface{}:
			if nextValue, exists := v[part]; exists {
				current = nextValue
			} else {
				return fmt.Errorf("поле '%s' не найдено на уровне %d", part, i+1)
			}
		default:
			return fmt.Errorf("невозможно навигировать по полю '%s' на уровне %d", part, i+1)
		}
	}
	
	// Устанавливаем значение в массиве
	lastField := fieldParts[len(fieldParts)-1]
	if array, ok := current.([]interface{}); ok {
		// Разбиваем результат по строкам для каждого элемента массива
		results := strings.Split(value, "\n")
		for i, item := range array {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if skipExisting {
					if _, exists := itemMap[lastField]; exists {
						continue // Skip if field exists
					}
				}
				if i < len(results) {
					itemMap[lastField] = results[i]
				}
			}
		}
		return nil
	}
	
	return fmt.Errorf("последний элемент пути '%s' не является массивом", strings.Join(fieldParts[:len(fieldParts)-1], "."))
}

// Сохранение в JSON с сохранением структуры
func saveAsPreservedJSON(originalContent, newField, result, outputPath string, skipExisting bool) error {
	var data interface{}
	if err := json.Unmarshal([]byte(originalContent), &data); err != nil {
		return fmt.Errorf("ошибка парсинга оригинального JSON: %v", err)
	}
	
    // Устанавливаем новое поле (учитываем пропуск уже заполненных значений)
    if err := setJSONField(data, newField, result, skipExisting); err != nil {
		return fmt.Errorf("ошибка установки поля '%s': %v", newField, err)
	}
	
	output, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("ошибка маршалинга результата: %v", err)
	}
	
	return os.WriteFile(outputPath, output, 0644)
}

// Сохранение как новый JSON
func saveAsNewJSON(filename, result, outputPath string) error {
	data := map[string]interface{}{
		"source_file": filename,
		"result":      result,
		"processed_at": time.Now().Format(time.RFC3339),
	}
	
	output, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("ошибка маршалинга результата: %v", err)
	}
	
	return os.WriteFile(outputPath, output, 0644)
}

// Обработка текста через ChatGPT в индивидуальном режиме
func processTextIndividually(textLines []string, content string, config Config, options ProcessOptions) ([]string, error) {
	var results []string
	errorCount := 0
	skippedCount := 0
	
	for i, line := range textLines {
		if strings.TrimSpace(line) == "" {
			results = append(results, "")
			continue
		}
		
		// Проверяем, нужно ли пропустить эту строку (если уже есть данные в целевом поле)
		if options.SkipExisting && options.NewJSONField != "" {
			// Проверяем наличие заполненного поля в оригинальном JSON
			exists, err := checkJSONFieldExists(content, options.NewJSONField)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Ошибка проверки поля для строки %d: %v\n", i+1, err)
			} else if exists {
				fmt.Fprintf(os.Stderr, "Пропускаю строку %d/%d (поле уже заполнено)\n", i+1, len(textLines))
				results = append(results, line) // оставляем оригинальную строку
				skippedCount++
				continue
			}
		}
		
		fmt.Fprintf(os.Stderr, "Обрабатываю строку %d/%d...\n", i+1, len(textLines))
		
		// Создаем промт для одной строки
		prompt := createPrompt(options.PromptTemplate, line, options.Language)
		
		// Отправляем запрос к ChatGPT с повторными попытками
		var result string
		var lastErr error
		maxRetries := options.MaxRetries
		if maxRetries <= 0 {
			maxRetries = 1 // Минимум одна попытка
		}
		
		for attempt := 1; attempt <= maxRetries; attempt++ {
			result, lastErr = callChatGPT(config, prompt, options.BaseDelay)
			if lastErr == nil {
				break // Успешно получили результат
			}
			
			fmt.Fprintf(os.Stderr, "Попытка %d/%d не удалась: %v\n", attempt, maxRetries, lastErr)
			if attempt < maxRetries {
				delay := options.RetryDelay
				if delay <= 0 {
					delay = 2 // По умолчанию 2 секунды
				}
				fmt.Fprintf(os.Stderr, "Повторяю через %d секунд...\n", delay)
				time.Sleep(time.Duration(delay) * time.Second)
			}
		}
		
		if lastErr != nil {
			fmt.Fprintf(os.Stderr, "Все %d попыток не удались для строки %d: %v\n", maxRetries, i+1, lastErr)
			fmt.Fprintf(os.Stderr, "Оставляю оригинальную строку: %s\n", line)
			results = append(results, line) // Оставляем оригинальную строку при всех неудачах
			errorCount++
			continue
		}
		
		results = append(results, result)
	}
	
	if errorCount > 0 {
		fmt.Fprintf(os.Stderr, "Обработано с ошибками: %d строк\n", errorCount)
	}
	
	if skippedCount > 0 {
		fmt.Fprintf(os.Stderr, "Пропущено строк (уже заполнены): %d\n", skippedCount)
	}
	
	return results, nil
}

// Обработка одного файла
func processFile(filename string, config Config, options ProcessOptions) error {
	fmt.Fprintf(os.Stderr, "Обрабатываю: %s\n", filename)
	
	// Читаем содержимое файла
	content, err := readFileContent(filename)
	if err != nil {
		return fmt.Errorf("ошибка чтения файла %s: %v", filename, err)
	}
	
	// Извлекаем нужную часть из JSON если необходимо
	var textToProcess string
	if options.JSONField != "" {
		textToProcess, err = extractJSONField(content, options.JSONField)
		if err != nil {
			return fmt.Errorf("ошибка извлечения поля из JSON в файле %s: %v", filename, err)
		}
	} else {
		textToProcess = content
	}
	
	var result string
	
	// Выбираем режим обработки
	if options.IndividualMode {
		// Индивидуальная обработка каждой строки
		lines := strings.Split(textToProcess, "\n")
		processedLines, err := processTextIndividually(lines, content, config, options)
		if err != nil {
			return fmt.Errorf("ошибка индивидуальной обработки файла %s: %v", filename, err)
		}
		result = strings.Join(processedLines, "\n")
	} else {
		// Пакетная обработка (по умолчанию)
		prompt := createPrompt(options.PromptTemplate, textToProcess, options.Language)
		result, err = callChatGPT(config, prompt, options.BaseDelay)
		if err != nil {
			return fmt.Errorf("ошибка обработки файла %s через ChatGPT: %v", filename, err)
		}
	}
	
	// Определяем путь для сохранения
	var outputPath string
	if options.InPlace {
		// Перезаписываем оригинальный файл
		outputPath = filename
	} else if options.Output != "" {
		if options.Recursive {
			// Для рекурсивной обработки создаем структуру папок
			relPath, _ := filepath.Rel(filepath.Dir(options.Input), filename)
			outputPath = filepath.Join(options.Output, relPath)
			
			// Создаем папки если необходимо
			if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
				return fmt.Errorf("ошибка создания папки: %v", err)
			}
		} else {
			outputPath = options.Output
		}
	}
	
	// Сохраняем результат
	if outputPath != "" {
        if options.PreserveJSON && options.JSONField != "" {
			// Сохраняем с сохранением оригинальной JSON структуры
            err = saveAsPreservedJSON(content, options.NewJSONField, result, outputPath, options.SkipExisting)
		} else if options.OutputJSON {
			// Сохраняем как новый JSON
			err = saveAsNewJSON(filename, result, outputPath)
		} else {
			// Сохраняем как обычный текст
			err = os.WriteFile(outputPath, []byte(result), 0644)
		}
		
		if err != nil {
			return fmt.Errorf("ошибка сохранения результата: %v", err)
		}
		
		fmt.Fprintf(os.Stderr, "Результат сохранен: %s\n", outputPath)
	} else {
		// Выводим в stdout
		if options.OutputJSON {
			data := map[string]interface{}{
				"source_file": filename,
				"result":      result,
				"processed_at": time.Now().Format(time.RFC3339),
			}
			output, _ := json.MarshalIndent(data, "", "  ")
			fmt.Println(string(output))
		} else {
			fmt.Println(result)
		}
	}
	
	return nil
}

// Основная функция
func main() {
	// Флаги командной строки
	var (
		input          = flag.String("i", "", "Входной файл или папка (обязательно)")
		recursive      = flag.Bool("r", false, "Рекурсивный поиск файлов в папке")
		jsonField      = flag.String("json-field", "", "Поле JSON для извлечения (если входной файл JSON)")
		output         = flag.String("o", "", "Файл вывода (если не указан - stdout)")
		outputJSON     = flag.Bool("json", false, "Вывод в формате JSON")
		preserveJSON   = flag.Bool("preserve-json", false, "Сохранить оригинальную JSON структуру")
		newJSONField   = flag.String("new-field", "chatgpt_result", "Новое поле для результата (работает с -preserve-json)")
		inPlace        = flag.Bool("in-place", false, "Перезаписать оригинальные файлы (игнорирует -o)")
		individualMode = flag.Bool("individual", false, "Обрабатывать каждую строку отдельно (убирает нумерацию)")
		maxRetries     = flag.Int("retries", 4, "Максимальное количество попыток для каждой строки (по умолчанию: 4)")
		retryDelay     = flag.Int("retry-delay", 2, "Задержка между попытками в секундах (по умолчанию: 2)")
		baseDelay      = flag.Int("base-delay", 1, "Базовая задержка перед каждым запросом в секундах (по умолчанию: 1)")
		skipExisting   = flag.Bool("skip-existing", false, "Пропускать строки с уже заполненными полями (работает с -new-field)")
		language       = flag.String("lang", "ru", "Язык обработки (ru, kk, en, fr, de, es, it, zh, ja, ko, ar, pt, nl, pl, tr, uk)")
		promptTemplate = flag.String("prompt", "humanize", "Шаблон промта (humanize, summarize, translate, analyze, extract, correct или свой)")
		apiKey         = flag.String("api-key", "", "API ключ ChatGPT (или переменная OPENAI_API_KEY)")
		model          = flag.String("model", "gpt-3.5-turbo", "Модель ChatGPT")
		maxTokens      = flag.Int("max-tokens", 1000, "Максимальное количество токенов")
		temperature    = flag.Float64("temperature", 0.7, "Температура (0.0-2.0)")
		baseURL        = flag.String("base-url", "https://api.openai.com/v1", "Базовый URL API")
		extensions     = flag.String("ext", "", "Расширения файлов через запятую (например: .txt,.md)")
		listTemplates  = flag.Bool("list-templates", false, "Показать доступные шаблоны промтов")
		listLanguages  = flag.Bool("list-languages", false, "Показать поддерживаемые языки")
	)
	
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Использование: %s [ОПЦИИ]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "\nЛегкий скрипт для обработки текста через ChatGPT API\n")
		fmt.Fprintf(os.Stderr, "Работает в духе Unix philosophy с файлами и папками\n\n")
		fmt.Fprintf(os.Stderr, "Примеры:\n")
		fmt.Fprintf(os.Stderr, "  %s -i file.txt -prompt humanize -lang ru\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -i data.json -json-field content -prompt summarize -lang en -o result.txt\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -i playlist.json -json-field program.source -prompt program_name -lang kk -preserve-json -new-field program.title -in-place\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -i playlist.json -json-field program.source -prompt program_name -lang kk -individual -preserve-json -new-field program.title -in-place\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -i playlist.json -json-field program.source -prompt program_name -lang kk -individual -retries 3 -retry-delay 1 -base-delay 2 -preserve-json -new-field program.title -in-place\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -i playlist.json -json-field program.source -prompt program_name -lang kk -individual -skip-existing -preserve-json -new-field program.title -in-place\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -i /docs -r -ext .txt -prompt correct -lang en -individual -retries 5 -base-delay 1 -in-place\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "\nОпции:\n")
		flag.PrintDefaults()
	}
	
	flag.Parse()
	
	// Показать доступные шаблоны
	if *listTemplates {
		fmt.Println("Доступные шаблоны промтов:")
		for name, template := range PromptTemplates {
			fmt.Printf("  %s: %s\n", name, template)
		}
		return
	}
	
	// Показать поддерживаемые языки
	if *listLanguages {
		fmt.Println("Поддерживаемые языки:")
		for code, name := range SupportedLanguages {
			fmt.Printf("  %s: %s\n", code, name)
		}
		return
	}
	
	// Проверка обязательных параметров
	if *input == "" {
		fmt.Fprintf(os.Stderr, "Ошибка: необходимо указать входной файл или папку (-i)\n")
		flag.Usage()
		os.Exit(1)
	}
	
	// Валидация параметров
	if *inPlace && *output != "" {
		fmt.Fprintf(os.Stderr, "Предупреждение: параметр -in-place игнорирует -o (файл вывода)\n")
	}
	
	if *inPlace {
		fmt.Fprintf(os.Stderr, "Внимание: режим -in-place перезапишет оригинальные файлы!\n")
	}
	
	// Получение API ключа
	apiKeyValue := *apiKey
	if apiKeyValue == "" {
		apiKeyValue = os.Getenv("OPENAI_API_KEY")
	}
	if apiKeyValue == "" {
		fmt.Fprintf(os.Stderr, "Ошибка: необходимо указать API ключ (-api-key или OPENAI_API_KEY)\n")
		os.Exit(1)
	}
	
	// Настройка конфигурации
	config := Config{
		APIKey:      apiKeyValue,
		Model:       *model,
		MaxTokens:   *maxTokens,
		Temperature: *temperature,
		BaseURL:     *baseURL,
	}
	
	// Парсинг расширений файлов
	var fileExtensions []string
	if *extensions != "" {
		for _, ext := range strings.Split(*extensions, ",") {
			ext = strings.TrimSpace(ext)
			if !strings.HasPrefix(ext, ".") {
				ext = "." + ext
			}
			fileExtensions = append(fileExtensions, strings.ToLower(ext))
		}
	}
	
	// Настройка опций обработки
	options := ProcessOptions{
		Input:          *input,
		Recursive:      *recursive,
		JSONField:      *jsonField,
		Output:         *output,
		OutputJSON:     *outputJSON,
		PreserveJSON:   *preserveJSON,
		NewJSONField:   *newJSONField,
		InPlace:        *inPlace,
		IndividualMode: *individualMode,
		MaxRetries:     *maxRetries,
		RetryDelay:     *retryDelay,
		BaseDelay:      *baseDelay,
		SkipExisting:   *skipExisting,
		Language:       *language,
		PromptTemplate: *promptTemplate,
		FileExtensions: fileExtensions,
	}
	
	// Поиск файлов для обработки
	files, err := findFiles(*input, *recursive, fileExtensions)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Ошибка поиска файлов: %v\n", err)
		os.Exit(1)
	}
	
	if len(files) == 0 {
		fmt.Fprintf(os.Stderr, "Файлы для обработки не найдены\n")
		os.Exit(1)
	}
	
	fmt.Fprintf(os.Stderr, "Найдено файлов для обработки: %d\n", len(files))
	
	// Обработка файлов
	errorCount := 0
	for _, file := range files {
		if err := processFile(file, config, options); err != nil {
			fmt.Fprintf(os.Stderr, "Ошибка: %v\n", err)
			errorCount++
		}
	}
	
	fmt.Fprintf(os.Stderr, "Обработка завершена. Ошибок: %d\n", errorCount)
	
	if errorCount > 0 {
		os.Exit(1)
	}
}
