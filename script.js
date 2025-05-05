document.addEventListener('DOMContentLoaded', () => {
    const quoteText = document.getElementById('quote-text');
    const stocksTable = document.querySelector('#stocksTable tbody');
    const lookupBtn = document.getElementById('lookupBtn');
    const tickerInput = document.getElementById('tickerInput');
    const daysSelector = document.getElementById('daysSelector');
    const carousel = document.getElementById('dogCarousel')
    const breedButtons = document.getElementById('breed-buttons')
    const listenOnBtn = document.getElementById('listen-on');
    const listenOffBtn = document.getElementById('listen-off');

    setupVoiceCommands();

    listenOnBtn?.addEventListener('click', () => {
        if (annyang) annyang.start();
    });

    listenOffBtn?.addEventListener('click', () => {
        if (annyang) annyang.abort();
    });

    if (quoteText) fetchQuote(quoteText);
    if (stocksTable) fetchTopStocks(stocksTable);
    if (carousel) loadRandomDogs();
    if (breedButtons) fetchBreeds();

    if (lookupBtn && tickerInput && daysSelector) {
        lookupBtn.addEventListener('click', async () => {
            const ticker = tickerInput.value.trim().toUpperCase();
            const days = parseInt(daysSelector.value, 10);

            if (!ticker) {
                alert('Please enter a stock ticker.');
                return;
            }

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days);

            const from = startDate.toISOString().split('T')[0];
            const to = endDate.toISOString().split('T')[0];

            const apiKey = 'uy0DHOvz9SjwqPkvSqDtmnDrFJlA487w';
            const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=120&apiKey=${apiKey}`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                if (!data.results || data.results.length === 0) {
                    alert('No data found for this ticker');
                    return;
                }

                const labels = data.results.map(item => {
                    const date = new Date(item.t);
                    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                });
                console.log(labels);
                const closingPrices = data.results.map(item => item.c);

                renderStockChart(ticker, days, labels, closingPrices);
            } catch (err) {
                console.error('Error fetching stock data:', err);
                alert('An error occurred while fetching stock data.');
            }
        });
    }
});

function setupVoiceCommands() {
    if (!annyang) return;

    const commands = {
        'hello': () => alert('Hello World'),

        'change the color to *color': color => {
            document.body.style.backgroundColor = color;
        },

        'navigate to *page': page => {
            const destination = page.toLowerCase();

            if (destination.includes('home')) {
                window.location.href = 'index.html';
            } else if (destination.includes('stocks')) {
                window.location.href = 'stocks.html';
            } else if (destination.includes('dogs')) {
                window.location.href = 'dogs.html';
            }
        }
    };

    const pathname = window.location.pathname;

    if (pathname.includes('stocks.html')) {
        commands['look up stock *ticker'] = ticker => {
            const input = document.getElementById('tickerInput');
            const button = document.getElementById('lookupBtn');
            if (input && button) {
                input.value = ticker.toUpperCase().slice(0, 5); // max 5 chars
                button.click();
            }
        };
    }

    if (pathname.includes('dogs.html')) {
        commands['load dog breed *breed'] = breedName => {
            const buttons = document.querySelectorAll('#breed-buttons button');
            const lower = breedName.toLowerCase();
            for (const button of buttons) {
                if (button.textContent.toLowerCase().includes(lower)) {
                    button.click();
                    break;
                }
            }
        };
    }

    annyang.addCommands(commands);
}

function renderStockChart(ticker, days, labels, closingPrices) {
    let canvas = document.getElementById('stockChart');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'stockChart';

        const table = document.getElementById('stocksTable');
        const lookupBtn = document.getElementById('lookupBtn');
        lookupBtn.parentNode.insertBefore(canvas, table);
    }

    if (window.stockChartInstance) {
        window.stockChartInstance.destroy();
    }

    window.stockChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${ticker} Closing Prices`,
                data: closingPrices,
                borderColor: 'rgb(0, 128, 0)',
                backgroundColor: 'rgb(34, 139, 34, 0.25)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${ticker} Closing Prices Over Last ${days} Days`,
                    color: 'black'
                },
                legend: {
                    labels: {
                        color: 'black'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'black'
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        color: 'black'
                    },
                    ticks: {
                        color: 'black'
                    }
                },
                y: {
                    grid: {
                        color: 'black'
                    },
                    title: {
                        display: true,
                        text: 'Price (USD)',
                        color: 'black'
                    },
                    ticks: {
                        color: 'black'
                    }
                }
            }
        }
    });
}

async function fetchQuote(quoteTextElement) {
    try {
        const res = await fetch('https://zenquotes.io/api/random');
        const data = await res.json();
        const quote = data[0];
        quoteTextElement.innerHTML = `“${quote.q}”<br>— ${quote.a}`;
    } catch (err) {
        console.error('Error fetching quote:', err);
        quoteTextElement.textContent = 'Failed to load quote. Please try again later.';
    }
}

async function fetchTopStocks(tbody) {
    try {
        const res = await fetch('https://tradestie.com/api/v1/apps/reddit?date=2022-04-03');
        const data = await res.json();
        const top5 = data.slice(0, 5);

        top5.forEach(stock => {
            const row = document.createElement('tr');

            const sentimentIcon = stock.sentiment.toLowerCase() === 'bearish'
                ? '<img src="static/bear.png" alt="Bearish" width="30">'
                : '<img src="static/bull.png" alt="Bullish" width="30">';

            row.innerHTML = `
                <td><a href="https://finance.yahoo.com/quote/${stock.ticker}">${stock.ticker}</a></td>
                <td>${stock.no_of_comments}</td>
                <td>${sentimentIcon}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Failed to fetch stock data:', err);
    }
}

async function loadRandomDogs() {
    try {
      const res = await fetch('https://dog.ceo/api/breeds/image/random/10');
      const { message: images } = await res.json();
      const carouselInner = document.getElementById('carouselInner');
      carouselInner.innerHTML = '';
  
      images.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'carousel-item' + (index === 0 ? ' active' : '');
        item.innerHTML = `<img src="${url}" class="d-block w-100" alt="Dog Image">`;
        carouselInner.appendChild(item);
      });
    } catch (error) {
      console.error('Failed to load dog images:', error);
    }
}

async function fetchBreeds() {
    try {
        const response = await fetch('https://dogapi.dog/api/v2/breeds');
        const data = await response.json();
        console.log(data);
        const breeds = data.data;
        const breedButtonsContainer = document.getElementById('breed-buttons');

        breeds.forEach(breed => {
            const button = document.createElement('button');
            button.textContent = breed.attributes.name;
            button.classList.add('custom-btn', 'breed-button'); 
            button.setAttribute('data-id', breed.id);
            button.addEventListener('click', () => displayBreedInfo(breed.id));
            breedButtonsContainer.appendChild(button);
        });
    } catch (error) {
        console.error('Error fetching breeds:', error);
    }
}

async function displayBreedInfo(breedId) {
    try {
        const response = await fetch(`https://dogapi.dog/api/v2/breeds/${breedId}`);
        const data = await response.json();
        const breed = data.data.attributes;

        const breedInfoContainer = document.getElementById('breed-info');
        breedInfoContainer.innerHTML = `
            <h3>${breed.name}</h3>
            <p><strong>Description:</strong> ${breed.description || 'N/A'}</p>
            <p><strong>Min Life Expectancy:</strong> ${breed.life.min || 'N/A'} years</p>
            <p><strong>Max Life Expectancy:</strong> ${breed.life.max || 'N/A'} years</p>
            `;
        breedInfoContainer.style.display = 'block';
    } catch (error) {
        console.error('Error fetching details: ', error);
    }
}


