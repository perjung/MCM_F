import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function checkModels() {
  try {
    // 구글 서버에 "내가 쓸 수 있는 모델 리스트 다 내놔!" 라고 요청하기
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ API 에러 발생:", data.error.message);
      return;
    }

    console.log("✅ 현재 내 API 키로 스토리(generateContent)를 만들 수 있는 모델 이름들:");
    data.models.forEach(model => {
      // 스토리 생성(generateContent) 기능을 지원하는 모델만 필터링해서 보여주기
      if (model.supportedGenerationMethods.includes('generateContent')) {
        // 앞에 붙은 'models/' 글자는 떼고 진짜 이름만 출력
        console.log(`- ${model.name.replace('models/', '')}`);
      }
    });
  } catch (error) {
    console.error("통신 에러:", error);
  }
}

checkModels();