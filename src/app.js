import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

let totalApiRequests = 0;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

app.get('/', (req, res) => {
  res.send('MCM Backend is running!');
});

app.get('/app/count', (req, res) => {
  res.json({ totalCalls: totalApiRequests });
});

app.post('/app/story', async (req, res) => {
  totalApiRequests += 1;

  try {
    const { schedules } = req.body;

    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ error: '일정 데이터가 올바르지 않습니다.' });
    }

    const prompt = `
너는 B급 코미디 시트콤 작가야.
아래 일정들이 망했을 때 벌어지는 대환장 미래 시나리오를 JSON으로만 써줘.

[일정 리스트]
${schedules.map(s => `- 시간대: ${s.time}, 계획: ${s.myAction || '평범한 일상'}`).join('\n')}

반드시 이 JSON 형식으로만 답해:
{
  "results": [
    {
      "time": "요청받은 시간대",
      "fullStory": "웃긴 전체 스토리",
      "extras": [
        {
          "name": "조연 이름",
          "action": "방해 행동 ~하기"
        }
      ]
    }
  ]
}
`;

    let storyData;

    try {
      const geminiModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '');
      storyData = JSON.parse(text);
    } catch (e) {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Respond ONLY in JSON format.' },
          { role: 'user', content: prompt },
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
      });

      storyData = JSON.parse(chatCompletion.choices[0].message.content);
    }

    res.status(200).json({ data: storyData.results || [] });
  } catch (error) {
    console.error('스토리 생성 실패:', error.message);

    const fallback = (req.body.schedules || []).map((s) => ({
      time: s.time,
      fullStory: `${s.myAction || '계획'}을 하려던 순간, 갑자기 엑스트라들이 난입해서 모든 계획이 대환장 코미디가 되었습니다!`,
      extras: [
        {
          name: '수상한 행인',
          action: '갑자기 등장해서 길을 막고 상황을 복잡하게 만들기',
        },
        {
          name: '과몰입 친구',
          action: '옆에서 쓸데없이 리액션을 크게 해서 모두의 시선을 끌기',
        },
      ],
    }));

    return res.status(200).json({
      data: fallback,
    });
  }
});

const PORT = process.env.PORT || 8080;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

export default app;