'use client';

import Image from "next/image";
import {useState, useRef} from "react";
import axios from "axios";
import { GoogleMap, Marker, useJsApiLoader, InfoWindow } from '@react-google-maps/api';

const center = {
  lat: -23.5505,
  lng: -46.6333
};

const containerStyle = {
  width: '100%',
  height: '400px'
};

const libraries = ['places'];


export default function Home() {
  const [id, setId] = useState<string>("");
  const [nome, setNome] = useState<string>("");
  const [telefone, setTelefone] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [lista, setLista] = useState<[]>([]);
  const [ativo, setAtivo] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyADIEg77WijSrEtp1AtogsrkgoXFIrkU5w', // coloque aqui sua chave
    libraries, // opcional, mas útil para autocomplete, etc.
  });
  
  if (!isLoaded) return <div>Carregando o mapa...</div>;

  const onLoad = (map = google.maps.Map) => {
    mapRef.current = map;
  };

  function centralizar(latitude = number, longitude = number) {
    mapRef.current?.panTo({ lat: latitude, lng: longitude });
  }

  function gravar () { 
    axios.post("http://localhost:8080/hospital", 
      {
        id: id,
        nome: nome,
        telefone: telefone, 
        latitude: latitude,
        longitude: longitude
      }
    )
    .then( ()=> { alert("Hospital gravado com sucesso");})
    .catch( ()=>{ alert("Erro ao gravar o hospital");})
    console.log("Gravando....");
    console.log("Id: " + id);
    console.log("Nome: " + nome);
    console.log("Telefone: " + telefone);
    console.log("Latitude: " + latitude);
    console.log("Longitude: " + longitude);
  }

  function ler() { 
    axios.get("http://localhost:8080/hospital")
    .then(( info )=>{
      console.log(info.data);
      const tempList  = [];
      for(const hospital of info.data) { 
        tempList.push(hospital);
      }
      setLista(tempList);
      const ultimoHospital = tempList[tempList.length - 1];
      centralizar(ultimoHospital.latitude, ultimoHospital.longitude);
    })
    .catch(()=>{alert("Erro ao carregar os dados do hospital");})
  }

  const listaDisplay = [];

  for (const hospital of lista) {
    listaDisplay.push( 
      <tr key={"hospital-" + hospital.id}>
        <td>{hospital.id}</td>
        <td>{hospital.nome}</td>
        <td>{hospital.telefone}</td>
      </tr>
    )
  }

  const listaDisplayMarkers  = [];

  for (const hospital of lista) {
    listaDisplayMarkers.push( 
      <Marker key={"hospital-" + hospital.id} 
              position={{lat: hospital.latitude, lng: hospital.longitude}}
              onClick={() => setAtivo(hospital.id)}>
        {ativo === hospital.id && (
            <InfoWindow onCloseClick={() => setAtivo(null)}>
              <div>
                <h3>{hospital.nome}</h3>
                <p>{hospital.telefone}</p>
              </div>
            </InfoWindow>
          )}
      </Marker>
    )
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <table>
          <tbody>
            <tr>
              <td>Id: </td>
              <td><input type="text" value={id} onChange={(e) => setId(e.target.value)}/></td>
            </tr>
            <tr>
              <td>Nome: </td>
              <td><input type="text" value={nome} onChange={(e) => setNome(e.target.value)}/></td>
            </tr>
            <tr>
              <td>Telefone: </td>
              <td><input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)}/></td>
            </tr>
            <tr>
              <td>Latitude: </td>
              <td><input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)}/></td>
            </tr>
            <tr>
              <td>Longitude: </td>
              <td><input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)}/></td>
            </tr>                        
            <tr>
              <td><button type="button" onClick={gravar}>Gravar Hospital</button></td>
              <td><button type="button" onClick={ler}>Ler</button></td>
            </tr>
          </tbody>
        </table>
        <table className="table">
          <tbody>
            { listaDisplay }
          </tbody>
        </table>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={12}
        >
          {listaDisplayMarkers}
        </GoogleMap>
        </main>
    </div>
  );
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

async function init() {
  await customElements.whenDefined('gmp-map');

  const map = document.querySelector('gmp-map');
  const marker = document.querySelector('gmp-advanced-marker');
  const placePicker = document.querySelector('gmpx-place-picker');
  const infowindow = new google.maps.InfoWindow();

  map.innerMap.setOptions({
    mapTypeControl: false
  });

  placePicker.addEventListener('gmpx-placechange', () => {
    const place = placePicker.value;

    if (!place.location) {
      window.alert(
        "No details available for input: '" + place.name + "'"
      );
      infowindow.close();
      marker.position = null;
      return;
    }

    if (place.viewport) {
      map.innerMap.fitBounds(place.viewport);
    } else {
      map.center = place.location;
      map.zoom = 17;
    }

    marker.position = place.location;
    infowindow.setContent(
      `<strong>${place.displayName}</strong><br>
       <span>${place.formattedAddress}</span>
    `);
    infowindow.open(map.innerMap, marker);
  });
}

document.addEventListener('DOMContentLoaded', init);