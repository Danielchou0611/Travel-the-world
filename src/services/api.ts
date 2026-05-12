import type { Trip, TripPreferences } from '../types';

// ─── Image placeholders using Unsplash (Japan-themed) ─────────────
const IMAGES = {
  fushimi: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&h=300&fit=crop',
  arashiyama: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop',
  kinkakuji: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=300&fit=crop',
  nishiki: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
  gion: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop',
  shinjuku: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
  shibuya: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&h=300&fit=crop',
  senso: 'https://images.unsplash.com/photo-1583416750470-965b2707b355?w=400&h=300&fit=crop',
  tsukiji: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
  hakone: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&h=300&fit=crop',
  onsen: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop',
  akihabara: 'https://images.unsplash.com/photo-1519482816300-1490faa543af?w=400&h=300&fit=crop',
  yokohama: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=400&h=300&fit=crop',
  teamlab: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop',
  mount_fuji: 'https://images.unsplash.com/photo-1570459027562-4a916cc6113f?w=400&h=300&fit=crop',
  ramen: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400&h=300&fit=crop',
  sushi: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=300&fit=crop',
  dotonbori: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=400&h=300&fit=crop',
};

export const MOCK_TRIP: Trip = {
  id: 'mock-trip-001',
  preferences: {
    days: 7,
    budget: 50000,
    interests: ['美食', '文化', '自然'],
    explorationStyle: 60,
    foodVsAttractions: 40,
    mustVisit: '清水寺',
    ragContent: '',
    specialRequirements: '',
  },
  summary: {
    totalDays: 7,
    totalBudget: 'NT$ 50,000',
    totalAttractions: 18,
    avgPerDay: 2.6,
  },
  days: [
    {
      day: 1,
      date: '4/18 (五)',
      attractions: [
        {
          id: 'a01',
          name: '伏見稻荷大社',
          nameEn: 'Fushimi Inari Taisha',
          category: '景點',
          description: '千本鳥居是京都最具代表性的景點，沿著山坡蜿蜒的朱紅鳥居在晨光中格外壯觀。可以選擇走完整條山路（約2小時）或只走前段網美打卡區。',
          image: IMAGES.fushimi,
          duration: '2–3 小時',
          rating: 4.8,
          estimatedCost: '免費',
          location: '京都・伏見区',
          baseScore: 92,
          foodScore: 10,
          explorationScore: 85,
          xai: {
            summary: '根據您選擇的「文化」興趣，AI 將此景點排在第1位。千本鳥居是京都文化的最高代表，與您的旅遊風格高度匹配。',
            scores: [
              { label: '文化符合度', value: 95, color: '#6366F1' },
              { label: '評分熱度', value: 88, color: '#10B981' },
              { label: '探索指數', value: 72, color: '#F59E0B' },
            ],
            matchedInterests: ['文化'],
          },
        },
        {
          id: 'a02',
          name: '錦市場',
          nameEn: 'Nishiki Market',
          category: '美食',
          description: '有「京都的廚房」之稱，長達400公尺的市場內有超過100家店舖，販售各種京都特色食材、醬菜、湯豆腐等在地美食，邊走邊吃是最佳體驗方式。',
          image: IMAGES.nishiki,
          duration: '1–2 小時',
          rating: 4.6,
          estimatedCost: '¥1,000–3,000',
          location: '京都・中京区',
          baseScore: 85,
          foodScore: 95,
          explorationScore: 40,
          xai: {
            summary: '您選擇「美食」作為主要興趣，錦市場是京都最重要的飲食文化體驗地點，AI 評分達85/100。',
            scores: [
              { label: '美食符合度', value: 95, color: '#6366F1' },
              { label: '文化深度', value: 78, color: '#10B981' },
              { label: '探索指數', value: 42, color: '#F59E0B' },
            ],
            matchedInterests: ['美食', '文化'],
          },
        },
        {
          id: 'a03',
          name: '祇園・花見小路',
          nameEn: 'Gion Hanamikoji',
          category: '文化',
          description: '京都最具代表性的藝伎文化街道，傍晚時分偶爾可見藝伎穿梭其中。石板路兩旁保留了江戶時代的傳統茶屋建築，是感受京都傳統氛圍的最佳地點。',
          image: IMAGES.gion,
          duration: '1–1.5 小時',
          rating: 4.7,
          estimatedCost: '免費（含餐 ¥3,000+）',
          location: '京都・東山区',
          baseScore: 88,
          foodScore: 30,
          explorationScore: 60,
          xai: {
            summary: '結合文化+觀光的雙重體驗，晚間前往可欣賞燈籠點亮的夜景，與您的7天預算行程完美配合。',
            scores: [
              { label: '文化符合度', value: 92, color: '#6366F1' },
              { label: '拍照潛力', value: 88, color: '#10B981' },
              { label: '夜間魅力', value: 82, color: '#F59E0B' },
            ],
            matchedInterests: ['文化'],
          },
        },
      ],
    },
    {
      day: 2,
      date: '4/19 (六)',
      attractions: [
        {
          id: 'a04',
          name: '金閣寺',
          nameEn: 'Kinkakuji Temple',
          category: '景點',
          description: '鹿苑寺舍利殿，外牆全以金箔覆蓋，映照在鏡湖池上宛如童話世界。全年遊客眾多，建議開門時間（9:00）前抵達以避開人潮。',
          image: IMAGES.kinkakuji,
          duration: '1–1.5 小時',
          rating: 4.7,
          estimatedCost: '¥500',
          location: '京都・北区',
          baseScore: 90,
          foodScore: 5,
          explorationScore: 50,
          xai: {
            summary: '金閣寺是世界遺產，AI 根據您的文化偏好評分90/100，建議安排在第2天早晨，避免旺季塞車。',
            scores: [
              { label: '文化符合度', value: 90, color: '#6366F1' },
              { label: '世界遺產', value: 100, color: '#10B981' },
              { label: '拍照潛力', value: 88, color: '#F59E0B' },
            ],
            matchedInterests: ['文化'],
          },
        },
        {
          id: 'a05',
          name: '嵐山・竹林小徑',
          nameEn: 'Arashiyama Bamboo Grove',
          category: '自然',
          description: '高達十多公尺的青翠竹林在微風搖曳中發出沙沙聲，光線穿透竹葉形成夢幻光影。步行至天龍寺再到渡月橋，整趟路線約2小時。',
          image: IMAGES.arashiyama,
          duration: '2–3 小時',
          rating: 4.6,
          estimatedCost: '免費',
          location: '京都・西京区',
          baseScore: 87,
          foodScore: 15,
          explorationScore: 80,
          xai: {
            summary: '您選擇「自然」偏好，嵐山竹林是日本最受歡迎的自然景觀之一，AI 評分87/100，與探索型旅遊風格高度匹配。',
            scores: [
              { label: '自然符合度', value: 92, color: '#6366F1' },
              { label: '減壓指數', value: 85, color: '#10B981' },
              { label: '探索指數', value: 80, color: '#F59E0B' },
            ],
            matchedInterests: ['自然'],
          },
        },
        {
          id: 'a06',
          name: '一蘭拉麵・京都店',
          nameEn: 'Ichiran Ramen Kyoto',
          category: '美食',
          description: '享譽國際的博多豚骨拉麵，個人隔間設計讓你專注享受拉麵的鮮美。可依個人口味調整麵條硬度、湯頭濃淡、辣度等，打造專屬一碗。',
          image: IMAGES.ramen,
          duration: '45 分鐘',
          rating: 4.5,
          estimatedCost: '¥1,500–2,500',
          location: '京都・中京区',
          baseScore: 82,
          foodScore: 98,
          explorationScore: 20,
          xai: {
            summary: '根據您的美食偏好，AI 在第2天晚餐時段安排一蘭拉麵，評分82/100，確保您體驗到經典日本拉麵文化。',
            scores: [
              { label: '美食符合度', value: 98, color: '#6366F1' },
              { label: '價格合理性', value: 80, color: '#10B981' },
              { label: '品牌知名度', value: 95, color: '#F59E0B' },
            ],
            matchedInterests: ['美食'],
          },
        },
      ],
    },
    {
      day: 3,
      date: '4/20 (日)',
      warning: '景點過多，建議減少至3–4個',
      attractions: [
        {
          id: 'a07',
          name: '新宿御苑',
          nameEn: 'Shinjuku Gyoen',
          category: '自然',
          description: '東京最大的城市公園，佔地58公頃，涵蓋日式、法式、英式三種庭園風格。春天的千棵櫻花樹讓這裡成為東京最熱門的賞花聖地。',
          image: IMAGES.shinjuku,
          duration: '2 小時',
          rating: 4.7,
          estimatedCost: '¥500',
          location: '東京・新宿区',
          baseScore: 85,
          foodScore: 10,
          explorationScore: 55,
          xai: {
            summary: '從京都移動至東京後，新宿御苑提供完美的減壓緩衝，AI 根據行程節奏優化評分85/100。',
            scores: [
              { label: '自然符合度', value: 88, color: '#6366F1' },
              { label: '行程節奏', value: 90, color: '#10B981' },
              { label: '季節適合度', value: 85, color: '#F59E0B' },
            ],
            matchedInterests: ['自然'],
          },
        },
        {
          id: 'a08',
          name: '澀谷十字路口',
          nameEn: 'Shibuya Scramble Crossing',
          category: '活動',
          description: '全球最繁忙的行人十字路口，每次綠燈約有3000人同時穿越。推薦前往Mag\'s Park或星巴克二樓俯瞰，傍晚霓虹燈亮起時最為壯觀。',
          image: IMAGES.shibuya,
          duration: '1–2 小時',
          rating: 4.5,
          estimatedCost: '免費',
          location: '東京・澀谷区',
          baseScore: 83,
          foodScore: 25,
          explorationScore: 70,
          xai: {
            summary: '澀谷代表現代東京的都市脈動，AI 將其排在第3天下午，讓您在轉換城市的同時感受東京最具代表性的景象。',
            scores: [
              { label: '都市體驗', value: 95, color: '#6366F1' },
              { label: '打卡熱度', value: 92, color: '#10B981' },
              { label: '夜間魅力', value: 88, color: '#F59E0B' },
            ],
            matchedInterests: ['文化'],
          },
        },
        {
          id: 'a09',
          name: '淺草寺・仲見世通',
          nameEn: 'Senso-ji Temple',
          category: '景點',
          description: '東京最古老的佛教寺院，建於628年，雷門的大提燈是東京的象徵。仲見世商店街長達250公尺，販售各種傳統工藝品和和菓子。',
          image: IMAGES.senso,
          duration: '1.5–2 小時',
          rating: 4.6,
          estimatedCost: '免費',
          location: '東京・台東区',
          baseScore: 88,
          foodScore: 45,
          explorationScore: 60,
          xai: {
            summary: '淺草寺是東京文化歷史的縮影，結合購物（仲見世）和文化體驗，AI 綜合評分88/100。',
            scores: [
              { label: '文化符合度', value: 90, color: '#6366F1' },
              { label: '購物體驗', value: 75, color: '#10B981' },
              { label: '歷史深度', value: 88, color: '#F59E0B' },
            ],
            matchedInterests: ['文化', '購物'],
          },
        },
        {
          id: 'a10',
          name: '築地場外市場',
          nameEn: 'Tsukiji Outer Market',
          category: '美食',
          description: '即使築地魚市場遷移至豐洲，場外市場依然保有活力。早晨可享用新鮮海鮮丼飯、玉子燒、生蠔等，是海鮮愛好者的天堂。',
          image: IMAGES.tsukiji,
          duration: '1.5 小時',
          rating: 4.5,
          estimatedCost: '¥2,000–5,000',
          location: '東京・中央区',
          baseScore: 84,
          foodScore: 97,
          explorationScore: 30,
          xai: {
            summary: '第3天行程較密集，AI 建議將築地安排在早餐時段（7:00–9:00），既解決用餐又體驗市場文化，效率最高。',
            scores: [
              { label: '美食符合度', value: 97, color: '#6366F1' },
              { label: '稀缺體驗', value: 85, color: '#10B981' },
              { label: '時段適合度', value: 82, color: '#F59E0B' },
            ],
            matchedInterests: ['美食'],
          },
        },
        {
          id: 'a11',
          name: '秋葉原電器街',
          nameEn: 'Akihabara Electric Town',
          category: '購物',
          description: '全球最大的電子產品和動漫文化聚集地，從最新電子設備、古董遊戲到限定動漫周邊應有盡有，是文化獵奇和購物的結合體驗。',
          image: IMAGES.akihabara,
          duration: '2–3 小時',
          rating: 4.4,
          estimatedCost: '¥0–不限',
          location: '東京・千代田区',
          baseScore: 78,
          foodScore: 20,
          explorationScore: 65,
          xai: {
            summary: '您的行程未選擇「購物」偏好，AI 給予較低優先度78/100，但仍推薦作為第3天的補充選項。',
            scores: [
              { label: '購物體驗', value: 85, color: '#6366F1' },
              { label: '偏好匹配', value: 60, color: '#10B981' },
              { label: '獨特指數', value: 88, color: '#F59E0B' },
            ],
            matchedInterests: [],
          },
        },
      ],
    },
    {
      day: 4,
      date: '4/21 (一)',
      attractions: [
        {
          id: 'a12',
          name: '箱根・大涌谷',
          nameEn: 'Hakone Owakudani',
          category: '自然',
          description: '活火山地熱地帶，硫磺氣體從地底噴出，可體驗著名黑玉子（溫泉黑蛋）。搭乘箱根空中纜車俯瞰山景，天氣晴朗時可遠眺富士山全景。',
          image: IMAGES.hakone,
          duration: '3–4 小時',
          rating: 4.5,
          estimatedCost: '¥1,500（纜車）',
          location: '神奈川・箱根',
          baseScore: 88,
          foodScore: 40,
          explorationScore: 90,
          xai: {
            summary: '箱根是結合自然、溫泉、富士山觀景的最佳一日遊目的地，與您「自然」偏好高度匹配，AI評分88/100。',
            scores: [
              { label: '自然符合度', value: 93, color: '#6366F1' },
              { label: '探索指數', value: 90, color: '#10B981' },
              { label: '富士山視野', value: 75, color: '#F59E0B' },
            ],
            matchedInterests: ['自然'],
          },
        },
        {
          id: 'a13',
          name: '箱根溫泉旅館',
          nameEn: 'Hakone Onsen Ryokan',
          category: '自然',
          description: '在傳統日式旅館中體驗露天溫泉風呂，泡著碳酸氫鈉泉仰望星空。晚餐享用懷石料理，是日本旅遊最奢華的放鬆體驗。',
          image: IMAGES.onsen,
          duration: '整晚住宿',
          rating: 4.8,
          estimatedCost: '¥15,000–40,000（含晚餐）',
          location: '神奈川・箱根',
          baseScore: 92,
          foodScore: 65,
          explorationScore: 30,
          xai: {
            summary: '根據您的標準預算，AI 推薦中價位溫泉旅館（含懷石晚餐），完美平衡體驗品質與預算控制。',
            scores: [
              { label: '放鬆指數', value: 98, color: '#6366F1' },
              { label: '文化體驗', value: 88, color: '#10B981' },
              { label: '預算匹配', value: 80, color: '#F59E0B' },
            ],
            matchedInterests: ['自然'],
          },
        },
      ],
    },
    {
      day: 5,
      date: '4/22 (二)',
      attractions: [
        {
          id: 'a14',
          name: 'teamLab Borderless',
          nameEn: 'teamLab Borderless',
          category: '活動',
          description: '沉浸式數位藝術空間，動態光影藝術裝置讓您穿梭於虛擬與現實之間。每個房間都是震撼的視覺體驗，強烈建議提前3–4週購票。',
          image: IMAGES.teamlab,
          duration: '2–3 小時',
          rating: 4.9,
          estimatedCost: '¥3,200',
          location: '東京・豐洲',
          baseScore: 95,
          foodScore: 5,
          explorationScore: 95,
          xai: {
            summary: 'teamLab在全球旅遊評分中名列前茅，AI 根據您的探索型風格評分95/100，強烈推薦在行程中安排。',
            scores: [
              { label: '獨特指數', value: 99, color: '#6366F1' },
              { label: '探索符合度', value: 95, color: '#10B981' },
              { label: '全球口碑', value: 98, color: '#F59E0B' },
            ],
            matchedInterests: ['文化'],
          },
        },
        {
          id: 'a15',
          name: '壽司大・豐洲市場',
          nameEn: 'Sushi Dai Toyosu',
          category: '美食',
          description: '豐洲市場內最受旅客追捧的壽司餐廳，使用當天最新鮮的食材。需要排隊等待（1–3小時），但品嚐師傅精心挑選的今日推薦握壽司，完全值得。',
          image: IMAGES.sushi,
          duration: '1.5–2 小時（含排隊）',
          rating: 4.8,
          estimatedCost: '¥4,000–6,000',
          location: '東京・豐洲',
          baseScore: 91,
          foodScore: 99,
          explorationScore: 25,
          xai: {
            summary: '與teamLab鄰近的豐洲市場壽司，AI將其安排在下午茶前，形成完美的「藝術+美食」豐洲半日遊組合。',
            scores: [
              { label: '美食符合度', value: 99, color: '#6366F1' },
              { label: '新鮮度', value: 100, color: '#10B981' },
              { label: '路線效率', value: 88, color: '#F59E0B' },
            ],
            matchedInterests: ['美食'],
          },
        },
      ],
    },
    {
      day: 6,
      date: '4/23 (三)',
      attractions: [
        {
          id: 'a16',
          name: '富士山五合目',
          nameEn: 'Mt. Fuji 5th Station',
          category: '自然',
          description: '搭乘高速巴士直達富士山五合目（海拔2305公尺），欣賞雲海和火山岩地景。如果挑戰登頂，需要提前準備登山裝備（7月中旬至9月登山季）。',
          image: IMAGES.mount_fuji,
          duration: '4–6 小時（含交通）',
          rating: 4.9,
          estimatedCost: '¥2,500（交通）',
          location: '山梨・富士吉田市',
          baseScore: 96,
          foodScore: 5,
          explorationScore: 98,
          xai: {
            summary: '富士山是日本最高的探索體驗，AI 根據您60/100的探索型風格，推薦五合目觀景（不強迫登頂），評分96/100。',
            scores: [
              { label: '自然符合度', value: 98, color: '#6366F1' },
              { label: '探索符合度', value: 95, color: '#10B981' },
              { label: '世界遺產', value: 100, color: '#F59E0B' },
            ],
            matchedInterests: ['自然'],
          },
        },
        {
          id: 'a17',
          name: '道頓堀・大阪美食巡禮',
          nameEn: 'Dotonbori Food Tour',
          category: '美食',
          description: '大阪的美食心臟地帶，章魚燒、大阪燒、串炸等街頭小吃讓每個步驟都是驚喜。Glico跑步人看板是必拍打卡地點，夜晚霓虹倒映在護城河上極為浪漫。',
          image: IMAGES.dotonbori,
          duration: '2–3 小時',
          rating: 4.7,
          estimatedCost: '¥2,000–4,000',
          location: '大阪・中央区',
          baseScore: 90,
          foodScore: 96,
          explorationScore: 55,
          xai: {
            summary: '第6天行程從富士山移動至大阪，道頓堀是大阪最具代表性的美食體驗，AI評分90/100，完美結束關東行程。',
            scores: [
              { label: '美食符合度', value: 96, color: '#6366F1' },
              { label: '夜生活指數', value: 90, color: '#10B981' },
              { label: '文化體驗', value: 82, color: '#F59E0B' },
            ],
            matchedInterests: ['美食'],
          },
        },
      ],
    },
    {
      day: 7,
      date: '4/24 (四)',
      attractions: [
        {
          id: 'a18',
          name: '清水寺（指定景點）',
          nameEn: 'Kiyomizudera Temple',
          category: '景點',
          description: '懸崖上的木造舞台是清水寺的標誌，「清水の舞台から飛び降りる」意指下定決心。從舞台俯瞰京都市區全景，春天的粉紅櫻花和秋天的紅葉都是絕景。',
          image: IMAGES.kinkakuji,
          duration: '2–2.5 小時',
          rating: 4.8,
          estimatedCost: '¥400',
          location: '京都・東山区',
          baseScore: 94,
          foodScore: 15,
          explorationScore: 70,
          xai: {
            summary: '【必去景點】您在表單中指定清水寺，AI 將其安排在最後一天作為行程高潮，充分利用返程前的時間。',
            scores: [
              { label: '指定優先度', value: 100, color: '#6366F1' },
              { label: '文化符合度', value: 94, color: '#10B981' },
              { label: '世界遺產', value: 100, color: '#F59E0B' },
            ],
            matchedInterests: ['文化'],
          },
        },
      ],
    },
  ],
  generatedAt: new Date().toISOString(),
};

// ─── API service ─────────────────────────────────────────────────

// ─── API Configuration ───────────────────────────────────────────
const API_BASE_URL = 'http://127.0.0.1:8000'; // 本地開發用，部署後請修改為實際後端地址
// 注意：移除時間限制，允許長時間執行的 AI 行程生成
// const API_TIMEOUT = 120000; // 已移除

/**
 * Generates a trip by calling the real AI trip planning API
 * @param preferences - User's trip preferences
 * @returns Generated trip itinerary
 * @throws Error if API call fails
 */
export async function generateTrip(preferences: TripPreferences): Promise<Trip> {
  try {
    // 移除超時限制，允許 AI 行程生成需要的時間
    // const controller = new AbortController();
    // const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
      // 移除 signal 控制
      // signal: controller.signal,
    });

    // clearTimeout(timeoutId);

    // Handle non-200 responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    const backendResponse = await response.json() as any;

    // 印出後端回傳的原始資料，讓開發者確認
    console.log("=== Backend Generate Response ===");
    console.log(JSON.stringify(backendResponse, null, 2));

    // 🚨 後端返回格式可能是 {status, data} 或直接是 Trip 物件
    // 先檢查是否需要解包
    let tripData = backendResponse;
    if (backendResponse?.status === "success" && backendResponse?.data) {
      tripData = backendResponse.data;
    }

    // Ensure we have a complete trip object with all required fields
    // The backend might return a partial object with just an ID
    const trip: Trip = {
      // Use backend data or generate/use defaults
      id: tripData?.id || `trip-${Date.now()}`,
      preferences: tripData?.preferences || preferences,
      summary: tripData?.summary || {
        totalDays: preferences.days,
        totalBudget: `NT$ ${preferences.budget.toLocaleString()}`,
        totalAttractions: Math.round(preferences.days * 2.6),
        avgPerDay: 2.6,
      },
      days: tripData?.days || MOCK_TRIP.days,
      generatedAt: tripData?.generatedAt || new Date().toISOString(),
    };

    return trip;
  } catch (error) {
    console.error('❌ API call failed:', error);

    // If API fails, fallback to MOCK_TRIP for frontend testing
    console.warn('Using MOCK_TRIP for testing');

    // Return a mock trip with user preferences
    return {
      ...MOCK_TRIP,
      id: `trip-${Date.now()}`,
      preferences,
      summary: {
        totalDays: preferences.days,
        totalBudget: `NT$ ${preferences.budget.toLocaleString()}`,
        totalAttractions: Math.round(preferences.days * 2.6),
        avgPerDay: 2.6,
      },
    };
  }
}

// ─── Re-ranking logic (What-if, frontend only) ─────────────────────

export function rerankAttractions(
  attractions: typeof MOCK_TRIP.days[0]['attractions'],
  explorationStyle: number,   // 0–100
  foodVsAttractions: number,  // 0=food, 100=attractions
): typeof MOCK_TRIP.days[0]['attractions'] {
  const explorationWeight = explorationStyle / 100;
  const foodWeight = (100 - foodVsAttractions) / 100;

  return [...attractions].sort((a, b) => {
    const scoreA = a.baseScore
      + explorationWeight * a.explorationScore * 0.3
      + foodWeight * a.foodScore * 0.3;
    const scoreB = b.baseScore
      + explorationWeight * b.explorationScore * 0.3
      + foodWeight * b.foodScore * 0.3;
    return scoreB - scoreA;
  });
}

/**
 * Modifies an existing trip by calling the backend API
 */
export async function modifyTrip(destination: string, current_itinerary: Trip, user_request: string): Promise<Trip> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/modify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destination, current_itinerary, user_request }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    const backendResponse = await response.json() as any;

    // 印出後端回傳的原始資料，讓開發者確認
    console.log("=== Backend Modify Response ===");
    console.log(JSON.stringify(backendResponse, null, 2));

    let modifiedData = backendResponse;
    if (backendResponse?.status === "success" && backendResponse?.data) {
      modifiedData = backendResponse.data;
    }

    // Merge modified data with original trip to preserve ID, preferences, summary
    // modify endpoint typically returns {"days": [...]} based on schema
    const updatedTrip: Trip = {
      ...current_itinerary,
      days: modifiedData.days || modifiedData.itinerary || modifiedData, // Handle different possible structures
      generatedAt: new Date().toISOString(),
    };

    console.log("=== Frontend Updated Trip ===");
    console.log(updatedTrip);

    return updatedTrip;
  } catch (error) {
    console.error('❌ Modify API call failed:', error);
    throw error;
  }
}
