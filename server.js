const express = require('express');
const { fetchRecords } = require('./airtable/airtable'); // Airtable 모듈 가져오기
const cors = require('cors'); 
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// 루트 경로: 접속 성공 메시지 반환
app.get('/', (req, res) => {
  res.send('접속 성공');
});

// Airtable 데이터 테스트 엔드포인트
app.get('/api/test', async (req, res) => {
  try {
    // Airtable의 'tcr' 테이블에서 모든 데이터를 가져오는 테스트
    const records = await fetchRecords('tcr', '');
    res.json(records);  // 성공 시 데이터 반환
  } catch (error) {
    res.status(500).json({ error: 'Airtable API error' });
  }
});

// 서버 실행
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
