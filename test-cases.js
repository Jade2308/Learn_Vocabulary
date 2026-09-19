async function test() {
  console.log('--- TEST 1: Thêm từ "resilient" (Dedupe & Gemini & Free Dictionary) ---');
  try {
    const res = await fetch('http://localhost:3000/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headword: 'resilient' }),
    });
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Result:', JSON.stringify(data, null, 2));

    console.log('\n--- TEST 2: Thêm lại cùng từ "resilient" (Kiểm tra Dedupe cache) ---');
    const resDedupe = await fetch('http://localhost:3000/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headword: 'Resilient ' }),
    });
    const dataDedupe = await resDedupe.json();
    console.log('Dedupe Status:', resDedupe.status);
    console.log('Same Word ID:', data.id === dataDedupe.id ? 'PASSED (Đã dedupe thành công)' : 'FAILED');

    console.log('\n--- TEST 3: Lấy danh sách từ cần ôn (GET /api/reviews/due) ---');
    const resDue = await fetch('http://localhost:3000/api/reviews/due');
    const dataDue = await resDue.json();
    console.log('Due Words count:', Array.isArray(dataDue) ? dataDue.length : 0);

    if (Array.isArray(dataDue) && dataDue.length > 0) {
      const vocabId = dataDue[0].id;
      console.log(`\n--- TEST 4: Submit kết quả ôn Rating 3 (Good) cho vocab ID: ${vocabId} ---`);
      const resReview = await fetch(`http://localhost:3000/api/reviews/${vocabId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 3 }),
      });
      const dataReview = await resReview.json();
      console.log('Review result:', JSON.stringify(dataReview, null, 2));
    }

    console.log('\n--- TEST 5: Lấy danh sách chủ đề (GET /api/topics) ---');
    const resTopics = await fetch('http://localhost:3000/api/topics');
    const dataTopics = await resTopics.json();
    console.log('Topics result:', JSON.stringify(dataTopics, null, 2));

    console.log('\n--- TEST 6: Bắt đầu phiên ôn gấp (POST /api/cram-sessions) ---');
    const resCram = await fetch('http://localhost:3000/api/cram-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const dataCram = await resCram.json();
    console.log('Cram Session Words count:', dataCram.count);
  } catch (err) {
    console.error('Test Error:', err);
  }
}

test();

