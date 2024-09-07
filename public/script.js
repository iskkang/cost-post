document.getElementById('searchButton').addEventListener('click', () => {
    const departure = document.getElementById('departureInput').value;
    const destination = document.getElementById('destinationInput').value;
    let type = document.getElementById('typeInput').value;

    // Type 값 변환: 20 -> 20dv, 40 -> 40HQ
    if (type === '20') {
        type = '20dv';
    } else if (type === '40') {
        type = '40HQ';
    }

    // Fetch API로 서버에서 데이터를 가져옴
    fetch(`/api/tickets?pol=${departure}&pod=${destination}&type=${type}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const ticket = data[0];
                document.getElementById('priceDisplay').innerText = `가격: ${ticket.cost}원`;
                document.getElementById('typeDisplay').innerText = `유형: ${ticket.type}`;
                document.getElementById('timeDisplay').innerText = `시간: ${ticket.t_time}`;
                document.getElementById('routeDisplay').innerText = `경로: ${ticket.route}`;
            } else {
                document.getElementById('priceDisplay').innerText = '해당 경로에 대한 티켓 가격을 찾을 수 없습니다.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});
