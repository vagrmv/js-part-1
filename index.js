// Загрузка данных через await
async function getDataAsync(url) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow',
    });

    // При сетевой ошибке (мы оффлайн) из `fetch` вылетит эксцепшн.
    // Тут мы даём ему просто вылететь из функции дальше наверх.
    // Если же его нужно обработать, придётся обернуть в `try` и сам `fetch`:
    //
    // try {
    //     response = await fetch(url, {...});
    // } catch (error) {
    //     // Что-то делаем
    //     throw error;
    // }

    // Если мы тут, значит, запрос выполнился.
    // Но там может быть 404, 500, и т.д., поэтому проверяем ответ.
    if (response.ok) {
        return response.json();
    }

    // Пример кастомной ошибки (если нужно проставить какие-то поля
    // для внешнего кода). Можно выкинуть и сам `response`, смотря
    // какой у вас контракт. Главное перевести код в ветку `catch`.
    const error = {
        status: response.status,
        customError: 'wtfAsync',
    };
    throw error;
}

// // Загрузка данных через промисы (то же самое что `getDataAsync`)
// function getDataPromise(url) {
//     // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
//     return fetch(url, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         redirect: 'follow',
//     }).then(
//         (response) => {
//             // Если мы тут, значит, запрос выполнился.
//             // Но там может быть 404, 500, и т.д., поэтому проверяем ответ.
//             if (response.ok) {
//                 return response.json();
//             }
//             // Пример кастомной ошибки (если нужно проставить какие-то поля
//             // для внешнего кода). Можно зареджектить и сам `response`, смотря
//             // какой у вас контракт. Главное перевести код в ветку `catch`.
//             return Promise.reject({
//                 status: response.status,
//                 customError: 'wtfPromise',
//             });
//         },

//         // При сетевой ошибке (мы оффлайн) из fetch вылетит эксцепшн,
//         // и мы попадём в `onRejected` или в `.catch()` на промисе.
//         // Если не добавить `onRejected` или `catch`, при ошибке будет
//         // эксцепшн `Uncaught (in promise)`.
//         (error) => {
//             // Если не вернуть `Promise.reject()`, для внешнего кода
//             // промис будет зарезолвлен с `undefined`, и мы не попадём
//             // в ветку `catch` для обработки ошибок, а скорее всего
//             // получим другой эксцепшн, потому что у нас `undefined`
//             // вместо данных, с которыми мы работаем.
//             return Promise.reject(error);
//         }
//     );
// }

// Две функции просто для примера, выберите с await или promise, какая нравится
const getData = getDataAsync;

async function loadCountriesData() {
    let countries = [];
    try {
        // ПРОВЕРКА ОШИБКИ №1: ломаем этот урл, заменяя all на allolo,
        // получаем кастомную ошибку.
        countries = await getData('https://restcountries.com/v3.1/all?fields=name&fields=cca3&fields=area');
    } catch (error) {
        // console.log('catch for getData');
        // console.error(error);
        throw error;
    }
    return countries.reduce((result, country) => {
        result[country.cca3] = country;
        return result;
    }, {});
}

const form = document.getElementById('form');
const fromCountry = document.getElementById('fromCountry');
const toCountry = document.getElementById('toCountry');
const countriesList = document.getElementById('countriesList');
const submit = document.getElementById('submit');
const output = document.getElementById('output');

(async () => {
    fromCountry.disabled = true;
    toCountry.disabled = true;
    submit.disabled = true;

    output.textContent = 'Loading…';
    let countriesData = {};
    try {
        // ПРОВЕРКА ОШИБКИ №2: Ставим тут брейкпоинт и, когда дойдёт
        // до него, переходим в оффлайн-режим. Получаем эксцепшн из `fetch`.
        countriesData = await loadCountriesData();
    } catch (error) {
        // console.log('catch for loadCountriesData');
        // console.error(error);
        output.textContent = 'Something went wrong. Try to reset your compluter.';
        return;
    }
    output.textContent = '';

    // Заполняем список стран для подсказки в инпутах
    Object.keys(countriesData)
        .sort((a, b) => countriesData[b].area - countriesData[a].area)
        .forEach((code) => {
            const option = document.createElement('option');
            option.value = countriesData[code].name.common;
            countriesList.appendChild(option);
        });

    fromCountry.disabled = false;
    toCountry.disabled = false;
    submit.disabled = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!fromCountry.value || !toCountry.value) {
            output.textContent = 'Please, select both countries';
            return;
        }

        disableUI(true);

        output.textContent = `Loading path from ${fromCountry.value} to ${toCountry.value}...`;

        loadPath(countriesData)
            .then((result) => {
                const pathNames = [];
                result.path.forEach((code) => {
                    pathNames.push(countriesData[code].name.common);
                });

                output.innerHTML = `Path to destination: ${pathNames.join(' → ')}
        <br/>Countires in path: ${result.distance}
        <br/>Requests: ${result.requestsAmmount}`;
            })
            .catch((error) => {
                if (error.message) {
                    output.textContent = error.message;
                } else {
                    output.textContent = 'Error';
                }
            })
            .finally(() => {
                disableUI(false);
            });
    });
})();

function CountriesDict() {
    this.dict = {};
    this.addCountry = (country) => {
        this.dict[country.cca3] = country;
    };
    this.addCountries = (countriesArray) => {
        for (const country of countriesArray) {
            this.addCountry(country);
        }
    };
    this.isContain = (code) => {
        return Object.keys(this.dict).find((item) => {
            return item === code;
        });
    };
    this.printDict = () => {
        for (const code of Object.keys(this.dict)) {
            console.log(this.dict[code].toString());
        }
    };
}

function Country(cca3, name, bordersArray) {
    this.cca3 = cca3;
    this.name = name;
    this.bordersArray = bordersArray;
    this.toString = () => {
        return `cca3: ${this.cca3}\nname: ${this.name}\nborders: ${this.bordersArray}`;
    };
}

function disableUI(value) {
    fromCountry.disabled = value;
    toCountry.disabled = value;
    submit.disabled = value;
}

function getCodeFromName(name, countriesData) {
    return Object.keys(countriesData).find((code) => {
        return countriesData[code].name.common === name;
    });
}

async function loadCountryByCode(code) {
    let country = [];
    try {
        country = await getData(`https://restcountries.com/v3.1/alpha/${code}?fields=cca3&fields=name&fields=borders`);
    } catch (error) {
        throw error;
    }
    return new Country(country.cca3, country.name.common, country.borders);
}

async function loadPath(countriesData) {
    const codeFrom = getCodeFromName(fromCountry.value, countriesData);
    const codeTo = getCodeFromName(toCountry.value, countriesData);

    const countryFrom = await loadCountryByCode(codeFrom);
    const countryTo = await loadCountryByCode(codeTo);

    if (!countryFrom.bordersArray.length || !countryTo.bordersArray.length) {
        throw new Error('No ground path between two countries');
    }

    let requests = 2;
    const visited = new CountriesDict();
    const queue = [countryFrom.cca3];
    const distance = {
        [countryFrom.cca3]: 1,
    };
    const paths = {
        [countryFrom.cca3]: [countryFrom.cca3],
    };

    while (queue.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        const country = await loadCountryByCode(queue.shift());
        requests += 1;
        visited.addCountry(country);

        for (const code of country.bordersArray) {
            if (!visited.isContain(code) && !queue.includes(code)) {
                queue.push(code);
                if (!(distance[code] && distance[code] > distance[country.cca3] + 1)) {
                    distance[code] = distance[country.cca3] + 1;
                    paths[code] = [...paths[country.cca3], code];
                }
            }
            if (code === countryTo.cca3) {
                return {
                    path: paths[countryTo.cca3],
                    distance: distance[countryTo.cca3],
                    requestsAmmount: requests,
                };
            }
        }
    }
    throw new Error('No path');
}
