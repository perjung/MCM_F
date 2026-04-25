import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk'; // 👈 Groq 추가
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
let totalApiRequests = 0;

// API 호출 횟수 카운팅
app.use((req, res, next) => {
  if (req.path === '/app/story' && req.method === 'POST') {
    totalApiRequests++;
    console.log(`[API 호출 알림] 누적 호출: ${totalApiRequests}회`);
  }
  next();
});

app.get('/app/count', (req, res) => {
  res.json({ totalCalls: totalApiRequests });
});

// CORS 설정
const allowedOrigins = [
  'https://mcm-git-main-jjinddos-projects.vercel.app', 
  'http://localhost:3000', 'http://localhost:8081', 'http://localhost:8080'
];
app.use(cors({ origin: (o, cb) => !o || allowedOrigins.includes(o) ? cb(null, true) : cb(new Error('CORS')), credentials: true }));
app.use(express.json());

// --- AI 설정 ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: { responseMimeType: "application/json" }
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); // 👈 Groq 셋업
// ----------------

app.post('/app/story', async (req, res) => {
  const { schedules } = req.body;
  const prompt = `
    너는 B급 코미디 시트콤 작가야. 아래 일정들을 꼬아버린 '대환장 하루' 시나리오를 써줘.
    [일정 리스트]
    ${schedules.map(s => `- 시간: ${s.time}, 계획: ${s.myAction}`).join('\n')}
    
    결과는 반드시 JSON 형식을 지켜야 해:
    {
      "results": [
        { "time": "시간대", "fullStory": "망한 이야기", "extras": [{ "name": "이름", "action": "행동" }] }
      ]
    }
  `;

  let storyData;

  try {
    console.log("🚀 [1순위] Gemini 시도...");
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    storyData = JSON.parse(response.text().replace(/```json/g, '').replace(/```/g, ''));
    console.log("✅ Gemini 성공");

  } catch (err) {
    console.error("⚠️ Gemini 실패, Groq로 전환합니다.");
    
    try {
      // 🔥 [무료 구원투수] Groq (Llama-3-70b 모델 사용)
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are a comedy writer. Respond ONLY in JSON format." },
          { role: "user", content: prompt }
        ],
        model: "llama3-70b-8192", // 성능 좋은 70B 모델
        response_format: { type: "json_object" } // JSON 보장
      });

      storyData = JSON.parse(chatCompletion.choices[0].message.content);
      console.log("✅ Groq(Llama3) 대체 성공!");

    } catch (groqErr) {
      console.error("❌ 모든 AI 실패:", groqErr.message);
      return res.status(500).json({ error: "모든 AI가 지쳤습니다." });
    }
  }

  res.status(200).json({ data: storyData.results });
});

if (!process.env.VERCEL) {
  app.listen(8080, () => console.log(`🚀 Server on 8080`));
}
export default app;