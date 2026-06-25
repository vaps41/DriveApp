import React, { useEffect, useRef, useState } from 'react';
import carImg from './carro.png';

export default function HereMap({ apikey, startCoord, endCoord, isSimulating, onSimulationDone, onRouteCalculated }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const platformRef = useRef(null);
  
  const objectsRef = useRef({ startMarker: null, endMarker: null, routeLine: null });
  const animTimer = useRef(null);

  // Garantia de que a função de callback está sempre atualizada na memória
  const callbackRef = useRef(onSimulationDone);
  useEffect(() => { callbackRef.current = onSimulationDone; }, [onSimulationDone]);

  // Trava de segurança para a simulação só iniciar quando a linha existir
  const [routeReady, setRouteReady] = useState(false);

  // Inicialização Única do Mapa
  useEffect(() => {
    if (!window.H || !mapContainer.current || mapInstance.current) return;

    const platform = new window.H.service.Platform({ apikey });
    platformRef.current = platform;
    const defaultLayers = platform.createDefaultLayers();

    const map = new window.H.Map(
      mapContainer.current,
      defaultLayers.vector.normal.map,
      { zoom: 14, center: startCoord, pixelRatio: window.devicePixelRatio || 1 }
    );

    window.addEventListener('resize', () => map.getViewPort().resize());
    new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
    window.H.ui.UI.createDefault(map, defaultLayers);
    
    mapInstance.current = map;

    return () => {
      map.dispose();
      mapInstance.current = null;
    };
  }, [apikey]);

  const startLat = startCoord?.lat;
  const startLng = startCoord?.lng;
  const endLat = endCoord?.lat;
  const endLng = endCoord?.lng;

  // Traçar a Rota e colocar os Pinos
  useEffect(() => {
    if (!mapInstance.current || !startLat || !startLng || !endLat || !endLng) return;
    
    const map = mapInstance.current;
    const platform = platformRef.current;
    const obs = objectsRef.current;

    setRouteReady(false); // Bloqueia a animação até termos a rota

    // Limpeza segura dos objetos da viagem anterior
    const existingObjects = map.getObjects();
    const toRemove = existingObjects.filter(obj => obj === obs.routeLine || obj === obs.startMarker || obj === obs.endMarker);
    if (toRemove.length > 0) map.removeObjects(toRemove);

    // 🚗 INSERÇÃO DA IMAGEM DO CARRO AQUI
    const carIcon = new window.H.map.Icon(carImg, { size: { w: 48, h: 48 }, anchor: { x: 24, y: 24 } });
    
    // O Marcador inicial agora é o Carro, o Marcador final é o pino padrão
    obs.startMarker = new window.H.map.Marker({ lat: startLat, lng: startLng }, { icon: carIcon });
    obs.endMarker = new window.H.map.Marker({ lat: endLat, lng: endLng });
    map.addObjects([obs.startMarker, obs.endMarker]);

    // 🛡️ SISTEMA DE SEGURANÇA: Se o GPS falhar (ex: mesma coordenada), desenha uma linha reta simulada.
    const drawFallbackLine = () => {
      console.warn("Criando linha de simulação reta (Fallback).");
      const linestring = new window.H.geo.LineString();
      linestring.pushPoint({lat: startLat, lng: startLng});
      linestring.pushPoint({lat: endLat, lng: endLng});
      const routeLine = new window.H.map.Polyline(linestring, { style: { lineWidth: 5, strokeColor: '#2563eb' } });
      map.addObject(routeLine);
      obs.routeLine = routeLine;
      map.getViewModel().setLookAtData({ bounds: routeLine.getBoundingBox() }, true);
      setRouteReady(true);
    };

    const router = platform.getRoutingService(null, 8);
    router.calculateRoute({
      routingMode: 'fast', transportMode: 'car',
      origin: `${startLat},${startLng}`,
      destination: `${endLat},${endLng}`,
      return: 'polyline,summary'
    }, (result) => {
      if (result.routes.length > 0) {
        const route = result.routes[0];
        const linestring = window.H.geo.LineString.fromFlexiblePolyline(route.sections[0].polyline);
        
        const routeLine = new window.H.map.Polyline(linestring, {
          style: { lineWidth: 5, strokeColor: '#2563eb' }
        });

        map.addObject(routeLine);
        obs.routeLine = routeLine;
        
        map.getViewModel().setLookAtData({ bounds: routeLine.getBoundingBox() }, true);

        if (onRouteCalculated) {
          onRouteCalculated({ 
            distanceKm: (route.sections[0].summary.length / 1000).toFixed(1), 
            timeMin: Math.ceil(route.sections[0].summary.duration / 60) 
          });
        }
        
        setRouteReady(true); // Tudo pronto, liberta a animação
      } else {
        drawFallbackLine();
      }
    }, (error) => {
      drawFallbackLine(); // Se a API estiver sem limites, cria linha reta.
    });
  }, [startLat, startLng, endLat, endLng]);

  // Motor da Simulação Visual do Carro
  useEffect(() => {
    if (!isSimulating || !routeReady || !objectsRef.current.routeLine || !mapInstance.current) {
        clearTimeout(animTimer.current);
        return;
    }

    const lineString = objectsRef.current.routeLine.getGeometry();
    const pointsCount = lineString.getPointCount();
    let currentPoint = 0;

    const animateCar = () => {
      if (currentPoint < pointsCount) {
        const point = lineString.extractPoint(currentPoint);
        
        // Move o Ícone do Carro!
        if (objectsRef.current.startMarker) {
            objectsRef.current.startMarker.setGeometry(point);
        }
        
        if (currentPoint % 4 === 0) {
          mapInstance.current.setCenter(point, true);
        }
        
        currentPoint++;
        
        // Velocidade baseada na complexidade da curva (Linha reta vai mais devagar para ser visível)
        const speed = pointsCount < 10 ? 150 : 35;
        animTimer.current = setTimeout(animateCar, speed);
      } else {
        // Chegou ao fim da viagem, avança automaticamente o Status do Aplicativo!
        if (callbackRef.current) callbackRef.current();
      }
    };

    animateCar(); 
    
    return () => clearTimeout(animTimer.current);
  }, [isSimulating, routeReady]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
