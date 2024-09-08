const Airtable = require('airtable');
const dotenv = require('dotenv');

// 환경 변수 설정
dotenv.config();

// Airtable API 키와 Base ID 가져오기
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// 데이터 조회 함수
const fetchRecords = async (table, filterFormula) => {
  try {
    // Airtable에서 레코드 선택
    const records = await base(table).select({
      filterByFormula: filterFormula,  // 필터 공식 적용
      view: "Grid view"  // 뷰 선택
    }).all();  // 모든 페이지 데이터를 한 번에 조회

    // 결과를 id와 fields로 매핑하여 반환
    return records.map(record => ({
      id: record.id,
      fields: record.fields
    }));
  } catch (error) {
    // Airtable API 호출 실패 시 에러 출력
    console.error('Airtable API error:', error.message);  // 에러 메시지만 출력
    if (error.response) {
      console.error('Airtable API response error:', error.response.data);  // 응답이 있을 경우 출력
    }
    throw error;  // 호출한 쪽에서 에러를 처리할 수 있도록 에러 던짐
  }
};

module.exports = { fetchRecords };
