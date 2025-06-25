// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // Verifica em qual página estamos para executar o código certo
    if (document.getElementById('hospitais-lista')) {
        carregarHospitais();
    }
    if (document.getElementById('cadastro-form')) {
        configurarFormularioCadastro();
    }
});

async function carregarHospitais() {
    const lista = document.getElementById('hospitais-lista');
    lista.innerHTML = '<p>Carregando hospitais...</p>'; // Mensagem de carregamento

    const hospitais = await getHospitals();

    if (hospitais.length === 0) {
        lista.innerHTML = '<p>Nenhum hospital encontrado.</p>';
        return;
    }

    lista.innerHTML = ''; // Limpa a mensagem de carregamento

    hospitais.forEach(hospital => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${hospital.name}</h3>
            <p><strong>Endereço:</strong> ${hospital.endereco}</p>
            <p><strong>Especialidades:</strong> ${hospital.specialties.join(', ')}</p>
        `;
        lista.appendChild(card);
    });
}

function configurarFormularioCadastro() {
    const form = document.getElementById('cadastro-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página

        const hospitalData = {
            name: document.getElementById('name').value,
            endereco: document.getElementById('endereco').value,
            lat: parseFloat(document.getElementById('lat').value),
            lng: parseFloat(document.getElementById('lng').value),
            specialties: document.getElementById('specialties').value.split(',').map(s => s.trim())
        };

        const novoHospital = await createHospital(hospitalData);

        if (novoHospital) {
            alert('Hospital cadastrado com sucesso!');
            form.reset(); // Limpa o formulário
        } else {
            alert('Ocorreu um erro no cadastro.');
        }
    });
}

async function initMap() {
    const saoPaulo = { lat: -23.55052, lng: -46.633308 }; // Coordenadas de São Paulo
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: saoPaulo,
    });

    // Pega os hospitais da nossa API
    const hospitais = await getHospitals();

    // Cria um marcador para cada hospital
    hospitais.forEach(hospital => {
        new google.maps.Marker({
            position: { lat: hospital.lat, lng: hospital.lng },
            map: map,
            title: hospital.name,
        });
    });
}