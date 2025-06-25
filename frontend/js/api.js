// Simulação de dados que viriam do banco de dados
async function getHospitals() {
    return [
        {
            name: "Hospital São Paulo",
            waitTime: 25,
            specialties: ["Cardiologia", "Clínica Geral"],
            rating: 4,
            reviews: 150
        },
        {
            name: "Clínica Bem-Estar",
            waitTime: 10,
            specialties: ["Ortopedia", "Dermatologia"],
            rating: 5,
            reviews: 89
        },
        {
            name: "Hospital Central",
            waitTime: 55,
            specialties: ["Pediatria", "Clínica Geral"],
            rating: 3,
            reviews: 320
        }
    ];
}
const API_URL = 'http://localhost:8080/api';

async function getHospitals() {
    try {
        const response = await fetch(`${API_URL}/hospitais`);
        if (!response.ok) {
            throw new Error('Erro ao buscar hospitais');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return []; // Retorna um array vazio em caso de erro
    }
}

async function createHospital(hospitalData) {
    try {
        const response = await fetch(`${API_URL}/hospitais`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hospitalData)
        });
        if (!response.ok) {
            throw new Error('Erro ao cadastrar hospital');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return null; 
    }
}