const Airtable = require('airtable');
const dotenv = require('dotenv');

// 환경 변수 설정
dotenv.config();

// Airtable API 키와 Base ID 가져오기
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// 데이터 조회 함수
const fetchRecords = async (table, filterFormula) => {
  try {
    const records = await base(table).select({
      filterByFormula: filterFormula,
      view: "Grid view"
    }).firstPage();

    return records.map(record => ({
      id: record.id,
      fields: record.fields
    }));
  } catch (error) {
    console.error('Airtable API error:', error);
    throw error;
  }
};

module.exports = { fetchRecords };
