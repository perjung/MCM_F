import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// .env 파일에서 GEMINI_API_KEY를 불러오기 위한 설정
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Gemini AI 설정
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  // 💡 중요: AI가 헛소리 안 하고 딱 JSON 형식으로만 대답하게 강제하는 옵션
  generationConfig: { responseMimeType: "application/json" }
});

// 필수 설정
app.use(cors());
app.use(express.json()); // Body로 들어오는 JSON 데이터를 읽기 위해 꼭 필요함!

// 1. 기본 라우트 (GET 테스트용 - 브라우저 주소창에서 확인 가능)
app.get('/', (req, res) => {
  res.send('스토리 생성 백엔드 서버가 쌩쌩하게 돌아가는 중! 🚀');
});

// 2. 메인 AI 스토리 생성 라우트 (POST 테스트용 - Thunder Client로 확인)
app.post('/api/story', async (req, res) => {
  const { time, myAction } = req.body;

  // 행동을 입력 안 했을 경우의 예외 처리
// 행동 예외 처리 (조금 더 뻔뻔하게)
  const userActionDescription = myAction 
    ? `내가 "${myAction}"(을)를 엄청 진지하게 하고 있어.` 
    : `내가 이 시간에 할 일 없이 멍때리거나 할 법한 흔한 행동을 아무거나 던져봐.`;

  // AI에게 내릴 프롬프트
  const prompt = `
    너는 지금부터 B급 코미디 시트콤 작가야. 
    아래 정보를 바탕으로 아주 엉뚱하고 웃긴 엑스트라(조연)의 난입 스토리를 써줘.

    [배경 정보]
    - 현재 시간대: ${time}
    - 나의 상황: ${userActionDescription}
    
    나와는 전혀 상관없어 보이는 조연의 뜬금없는 행동이, 결과적으로 나에게 엄청난(혹은 어이없는) 개이득을 가져다주는 상황을 만들어줘. 위트 있고 통통 튀게 적어!
    결과는 반드시 아래의 JSON 형식으로만 응답해:
    {
      "name": "아주 구체적이고 특이한 조연의 정체 (예: 3년 차 비둘기, 길 잃은 배달원, 붕어빵 장수 2세)",
      "action": "조연이 하고 있는 엉뚱하거나 시선을 강탈하는 행동",
      "benefit": "그 얼토당토않은 행동 때문에 내가 얻어걸린 이점이나 웃긴 상황",
      "fullStory": "이 우당탕탕 상황을 찰진 입담으로 요약한 시트콤 나레이션 같은 한 문장"
    }
  `;

  try {
    // 구글 Gemini에게 생성 요청
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("RAW TEXT:", text);

    let storyData;

    try {
      const cleanText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      // AI가 준 글자를 자바스크립트가 읽을 수 있는 진짜 JSON으로 변환
      storyData = JSON.parse(cleanText);
    } catch (e) {
      console.error("❌ JSON 파싱 실패:", text);
      throw e;
    }
    // 성공했을 때 돌려줄 결과
    res.status(200).json({
      message: "AI 스토리 생성 완료!",
      data: {
        time: time,
        ...storyData
      }
    });

  } catch (error) {
    console.error("AI 생성 중 에러 발생:", error);
    res.status(500).json({ error: "스토리 생성 중 문제가 발생했습니다." });
  }
});

// 서버 켜기
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});